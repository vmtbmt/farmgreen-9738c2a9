import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

async function callGemini(body: Record<string, unknown>) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Thiếu LOVABLE_API_KEY");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: MODEL, ...body }),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("AI đang quá tải, vui lòng thử lại sau.");
    if (res.status === 402) throw new Error("Đã hết tín dụng AI. Vui lòng nạp thêm.");
    throw new Error(`AI lỗi [${res.status}]: ${text}`);
  }
  const json = await res.json();
  return String(json.choices?.[0]?.message?.content ?? "");
}

type GardenRow = { id: string; name: string; crop: string; area: number; location: string; planted_at: string };
type LogRow = { id: string; garden_id: string; type: string; date: string; note: string; cost: number };

async function loadContext(supabase: any) {
  const [g, l] = await Promise.all([
    supabase.from("gardens").select("id,name,crop,area,location,planted_at"),
    supabase.from("activity_logs").select("id,garden_id,type,date,note,cost").order("date", { ascending: false }).limit(500),
  ]);
  const gardens: GardenRow[] = g.data ?? [];
  const logs: LogRow[] = l.data ?? [];
  return { gardens, logs };
}

function buildDataSummary(gardens: GardenRow[], logs: LogRow[]) {
  const gById = new Map(gardens.map((x) => [x.id, x]));
  const gLines = gardens.map(
    (g) => `- ${g.name} (${g.crop}, ${g.area}m², vị trí: ${g.location || "?"}, gieo trồng: ${g.planted_at})`,
  );
  const lLines = logs.slice(0, 200).map((l) => {
    const gn = gById.get(l.garden_id)?.name ?? "?";
    return `- ${l.date} | ${gn} | ${l.type}${l.cost ? ` | ${l.cost}₫` : ""}${l.note ? ` | ${l.note}` : ""}`;
  });
  return `KHU VƯỜN (${gardens.length}):\n${gLines.join("\n") || "(chưa có)"}\n\nNHẬT KÝ (${logs.length} bản ghi, hiển thị mới nhất):\n${lLines.join("\n") || "(chưa có)"}`;
}

const FARM_PROMPT = `Bạn là trợ lý nông trại AI cá nhân. Trả lời NGẮN GỌN, RÕ RÀNG bằng tiếng Việt, dựa CHÍNH XÁC trên dữ liệu khu vườn và nhật ký của người dùng bên dưới. Nếu người dùng hỏi câu không liên quan dữ liệu, hãy chuyển hướng khéo léo về nông trại. Khi tính toán, nêu con số cụ thể (số lần, tổng chi phí, ngày gần nhất...).`;

const EXPERT_PROMPT = `Bạn là CHUYÊN GIA NÔNG NGHIỆP TÂY NGUYÊN, chuyên sâu về cà phê, sầu riêng, hồ tiêu và cây ăn trái, ưu tiên điều kiện canh tác tại Đắk Lắk. Trả lời NGẮN GỌN, THỰC TẾ, DỄ HIỂU bằng tiếng Việt, kèm CÁC BƯỚC XỬ LÝ cụ thể. Nếu không chắc chắn về bệnh cây, hãy nói rõ mức độ tin cậy và đề nghị người dùng chụp ảnh để chẩn đoán chính xác hơn.`;

const ChatInput = z.object({
  mode: z.enum(["farm", "expert"]),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).min(1),
});

export const chatWithAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ChatInput.parse(d))
  .handler(async ({ data, context }) => {
    let system = data.mode === "expert" ? EXPERT_PROMPT : FARM_PROMPT;
    if (data.mode === "farm") {
      const { gardens, logs } = await loadContext(context.supabase);
      system += `\n\n=== DỮ LIỆU THỰC TẾ NGƯỜI DÙNG ===\nHôm nay: ${new Date().toISOString().slice(0, 10)}\n${buildDataSummary(gardens, logs)}`;
    }
    const content = await callGemini({
      messages: [{ role: "system", content: system }, ...data.messages],
    });
    return { content };
  });

export const analyzeFarm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { gardens, logs } = await loadContext(context.supabase);
    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);
    const monthLogs = logs.filter((l) => l.date.startsWith(thisMonth));
    const totalCost = monthLogs.reduce((s, l) => s + Number(l.cost || 0), 0);
    const byGarden: Record<string, { count: number; cost: number }> = {};
    for (const l of monthLogs) {
      const b = (byGarden[l.garden_id] ||= { count: 0, cost: 0 });
      b.count++;
      b.cost += Number(l.cost || 0);
    }
    const gById = new Map(gardens.map((g) => [g.id, g]));
    const entries = Object.entries(byGarden).map(([id, v]) => ({ id, name: gById.get(id)?.name ?? "?", ...v }));
    const topActivity = [...entries].sort((a, b) => b.count - a.count)[0];
    const topCost = [...entries].sort((a, b) => b.cost - a.cost)[0];

    const summary = {
      activities_this_month: monthLogs.length,
      total_cost: totalCost,
      top_activity_garden: topActivity?.name ?? null,
      top_cost_garden: topCost?.name ?? null,
    };

    const alerts: Array<{ level: "warning" | "danger"; message: string }> = [];
    for (const g of gardens) {
      const gLogs = logs.filter((l) => l.garden_id === g.id);
      const last = gLogs[0];
      const daysSince = last ? Math.floor((now.getTime() - new Date(last.date).getTime()) / 86400000) : 9999;
      if (daysSince > 20) alerts.push({ level: "danger", message: `Khu ${g.name} đã ${daysSince} ngày chưa có hoạt động nào.` });
      else if (daysSince > 14) alerts.push({ level: "warning", message: `Khu ${g.name} đã ${daysSince} ngày chưa có hoạt động.` });
      const lastWater = gLogs.find((l) => l.type === "Tưới nước");
      const daysWater = lastWater ? Math.floor((now.getTime() - new Date(lastWater.date).getTime()) / 86400000) : 9999;
      if (daysWater > 20) alerts.push({ level: "danger", message: `Khu ${g.name} chưa được tưới trong ${daysWater} ngày.` });
    }

    const prompt = `Dựa vào dữ liệu nông trại sau, hãy đưa ra 3-5 KHUYẾN NGHỊ NGẮN GỌN (mỗi khuyến nghị 1 câu) bằng tiếng Việt cho nông dân. Chỉ trả về JSON: {"recommendations":["...","..."]}\n\nTHÁNG NÀY: ${monthLogs.length} hoạt động, tổng chi phí ${totalCost}₫.\nKhu nhiều hoạt động nhất: ${topActivity?.name ?? "-"} (${topActivity?.count ?? 0} lần).\nKhu nhiều chi phí nhất: ${topCost?.name ?? "-"} (${topCost?.cost ?? 0}₫).\n\n${buildDataSummary(gardens, logs.slice(0, 80))}`;

    let recommendations: string[] = [];
    try {
      const content = await callGemini({
        messages: [
          { role: "system", content: "Bạn là chuyên gia nông nghiệp. Chỉ trả JSON hợp lệ." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });
      const p = JSON.parse(content);
      recommendations = Array.isArray(p.recommendations) ? p.recommendations.map(String) : [];
    } catch (e) {
      recommendations = [];
    }

    return { summary, alerts, recommendations };
  });

export const generateMonthlyReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { gardens, logs } = await loadContext(context.supabase);
    const month = new Date().toISOString().slice(0, 7);
    const monthLogs = logs.filter((l) => l.date.startsWith(month));
    const gById = new Map(gardens.map((g) => [g.id, g]));
    const summary = {
      total_activities: monthLogs.length,
      watering: monthLogs.filter((l) => l.type === "Tưới nước").length,
      fertilizing: monthLogs.filter((l) => l.type === "Bón phân").length,
      spraying: monthLogs.filter((l) => l.type === "Phun thuốc").length,
      total_cost: monthLogs.reduce((s, l) => s + Number(l.cost || 0), 0),
    };
    const costByGarden: Record<string, number> = {};
    for (const l of monthLogs) costByGarden[l.garden_id] = (costByGarden[l.garden_id] || 0) + Number(l.cost || 0);
    const top = Object.entries(costByGarden).sort((a, b) => b[1] - a[1])[0];
    const topGarden = top ? { name: gById.get(top[0])?.name ?? "?", cost: top[1] } : null;

    const prompt = `Hãy phân tích dữ liệu nông trại tháng ${month} và trả về JSON:\n{"overview":"tóm tắt 2-3 câu","observations":["nhận xét 1","..."],"risks":["rủi ro 1","..."],"recommendations":["khuyến nghị tháng tới 1","..."]}\n\nDữ liệu tháng: ${JSON.stringify(summary)}\nKhu có chi phí cao nhất: ${topGarden?.name ?? "-"} (${topGarden?.cost ?? 0}₫)\n\n${buildDataSummary(gardens, monthLogs)}`;

    let ai = { overview: "", observations: [] as string[], risks: [] as string[], recommendations: [] as string[] };
    try {
      const content = await callGemini({
        messages: [
          { role: "system", content: "Bạn là chuyên gia nông nghiệp Tây Nguyên. Chỉ trả JSON hợp lệ, tiếng Việt." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });
      const p = JSON.parse(content);
      ai = {
        overview: String(p.overview ?? ""),
        observations: (p.observations ?? []).map(String),
        risks: (p.risks ?? []).map(String),
        recommendations: (p.recommendations ?? []).map(String),
      };
    } catch {}

    return { month, summary, topGarden, ai };
  });

const DiagnoseInput = z.object({
  imageDataUrl: z.string().startsWith("data:image/"),
  gardenId: z.string().uuid().nullable().optional(),
});

export const diagnoseDisease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DiagnoseInput.parse(d))
  .handler(async ({ data, context }) => {
    const prompt = `Bạn là chuyên gia bệnh cây trồng Tây Nguyên (cà phê, sầu riêng, hồ tiêu, cây ăn trái). Quan sát ảnh và chẩn đoán. Chỉ trả về JSON:\n{"diagnosis":"tên bệnh nghi ngờ","confidence":85,"cause":"nguyên nhân ngắn gọn","recommendation":"cách xử lý cụ thể theo bước","urgency":"thấp|trung bình|cao"}\nconfidence là số 0-100. Nếu ảnh không phải cây trồng, đặt diagnosis="Không xác định" và confidence=0.`;

    const content = await callGemini({
      messages: [
        { role: "system", content: "Bạn chỉ trả JSON hợp lệ, tiếng Việt." },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: data.imageDataUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { throw new Error("AI trả về không hợp lệ"); }

    const record = {
      user_id: context.userId,
      garden_id: data.gardenId ?? null,
      image_url: data.imageDataUrl,
      diagnosis: String(parsed.diagnosis ?? "Không xác định"),
      confidence: Number(parsed.confidence ?? 0),
      cause: String(parsed.cause ?? ""),
      recommendation: String(parsed.recommendation ?? ""),
      urgency: String(parsed.urgency ?? "thấp"),
    };
    const { data: inserted, error } = await context.supabase
      .from("disease_checks")
      .insert(record)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });
