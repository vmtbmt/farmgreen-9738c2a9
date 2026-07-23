import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerSession } from "@lovable.dev/cloud-auth-js";

const InputSchema = z.object({ text: z.string().min(1) });

export const parseFarmLog = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    // Authentication check - require authenticated user
    const session = await getServerSession();
    if (!session?.user?.id) {
      throw new Error("Unauthorized: Please log in to use this feature");
    }

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          {
            role: "system",
            content:
              'Bạn là trợ lý phân tích nhật ký nông trại tiếng Việt. Trích xuất thông tin từ câu người dùng và CHỈ trả về JSON hợp lệ dạng {"activity_type":""[...]
          },
          { role: "user", content: data.text },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`AI gateway failed [${res.status}]: ${body}`);
    }

    const json = await res.json();
    const content: string = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: Record<string, string>;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("Không parse được JSON từ AI");
    }
    return {
      activity_type: String(parsed.activity_type ?? ""),
      quantity: String(parsed.quantity ?? ""),
      material: String(parsed.material ?? ""),
      field_name: String(parsed.field_name ?? ""),
    };
  });
