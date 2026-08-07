import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Sparkles,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Target,
  Lightbulb,
  CloudSun,
  ListChecks,
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { analyzeFarm } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";

type Analysis = Awaited<ReturnType<typeof analyzeFarm>> | null;

export function DashboardAI() {
  const analyze = useServerFn(analyzeFarm);
  const [data, setData] = useState<Analysis>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyze();
      setData(res);
      setShowDetails(false); // keep collapsed until user asks
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi phân tích");
    } finally {
      setLoading(false);
    }
  };

  // Empty state — chưa từng gọi AI
  if (!data && !loading && !error) {
    return (
      <Card className="overflow-hidden border-primary/30">
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl gradient-primary text-primary-foreground shadow-md">
            <Sparkles className="h-8 w-8" />
          </div>
          <div className="max-w-sm">
            <h3 className="text-lg font-bold">Cần lời khuyên cho nông trại hôm nay?</h3>
            <p className="mt-2 text-sm text-muted-foreground">Phân tích nhanh dựa trên dữ liệu vườn, thời tiết và hoạt động gần đây. AI sẽ chỉ chạy khi bạn bấm.</p>
          </div>
          <div className="mt-2">
            <Button onClick={run} size="lg" className="gradient-primary text-primary-foreground shadow-md">
              <Sparkles className="h-4 w-4" /> Hỏi AI tư vấn hôm nay
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Tư vấn AI cho nông trại
            </CardTitle>
            {lastUpdatedAt && (
              <div className="text-xs text-muted-foreground">Cập nhật: {new Date(lastUpdatedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</div>
            )}
          </div>
          <div className="text-xs text-muted-foreground">AI chỉ chạy khi bạn bấm, không tự động gọi.</div>
        </div>

        {data && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={run} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-1">Làm mới</span>
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowDetails((s) => !s)}>
              {showDetails ? "Thu gọn" : "Xem chi tiết"}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">Đang phân tích nông trại của bạn...</p>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            <p className="font-medium">Không thể phân tích</p>
            <p className="mt-1 opacity-90">{error}</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={run}>
              Thử lại
            </Button>
          </div>
        )}

        {data && !loading && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MiniStat label="Hoạt động" value={data.summary.activities_this_month} />
              <MiniStat label="Tổng chi phí" value={`${data.summary.total_cost.toLocaleString("vi-VN")}₫`} />
              <MiniStat label="Nhiều hoạt động" value={data.summary.top_activity_garden ?? "—"} />
              <MiniStat label="Nhiều chi phí" value={data.summary.top_cost_garden ?? "—"} />
            </div>

            {/* Collapsed brief recommendations */}
            {!showDetails && (
              <div className="rounded-lg border border-border p-4 animate-in fade-in-0 slide-in-from-top-2">
                <h4 className="text-sm font-semibold">Tóm tắt khuyến nghị</h4>
                {data.recommendations.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">Không có khuyến nghị đặc biệt. Nông trại đang ổn định.</p>
                ) : (
                  <ul className="mt-2 space-y-2 text-sm">
                    {data.recommendations.slice(0, 2).map((r, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <div className="flex items-start gap-2">
                          <span>{r}</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-6 w-6 p-0">
                                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">{explainRecommendation(r)}</TooltipContent>
                          </Tooltip>
                        </div>
                      </li>
                    ))}
                    {data.recommendations.length > 2 && <li className="text-sm text-muted-foreground">...và {data.recommendations.length - 2} khuyến nghị khác</li>}
                  </ul>
                )}
                <div className="mt-3 flex justify-end">
                  <Button size="sm" onClick={() => setShowDetails(true)}>{data.recommendations.length ? "Xem tất cả" : "Phân tích chi tiết"}</Button>
                </div>
              </div>
            )}

            {/* Full detail accordion shown when user expands */}
            {showDetails && (
              <div className="animate-in fade-in-0 slide-in-from-top-2">
                <Accordion type="multiple" defaultValue={["reco"]} className="w-full">
                <AccordionItem value="reco">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2"><Lightbulb className="h-4 w-4 text-primary" /> Khuyến nghị hôm nay</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    {data.recommendations.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Chưa có khuyến nghị đặc biệt. Nông trại đang ổn định.</p>
                    ) : (
                      <ul className="space-y-1.5 text-sm">
                        {data.recommendations.map((r, i) => (
                          <li key={i} className="flex gap-2"><Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> <span>{r}</span></li>
                        ))}
                      </ul>
                    )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="weather">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2"><CloudSun className="h-4 w-4 text-sky-500" /> Ảnh hưởng thời tiết</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">Kiểm tra widget thời tiết và khung giờ phun thuốc phía trên để lên kế hoạch tưới, phun thuốc phù hợp.</p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="tasks">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2"><ListChecks className="h-4 w-4 text-emerald-600" /> Công việc đề xuất</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">Xem "Công việc hôm nay" ở trên để có checklist tự động dựa trên nhật ký gần đây.</p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="risks">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-amber-500" /> Rủi ro tiềm ẩn</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    {data.alerts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Không phát hiện rủi ro. Tuyệt vời! 🌱</p>
                    ) : (
                      <div className="space-y-2">
                        {data.alerts.map((a, i) => (
                          <div key={i} className={cn("flex gap-2 rounded-lg border p-3 text-sm", a.level === "danger" ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400") }>
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{a.message}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-lg font-bold">{value}</div>
    </div>
  );
}

function explainRecommendation(text: string) {
  const t = text.toLowerCase();
  if (t.includes("phun")) return "Hoãn phun thuốc: tránh phun khi trời có mưa hoặc độ ẩm cao để giảm rủi ro thất bại và lãng phí thuốc.";
  if (t.includes("tưới") || t.includes("tưới nước")) return "Tưới: đảm bảo độ ẩm phù hợp, ưu tiên buổi sáng hoặc chiều mát để giảm bốc hơi.";
  if (t.includes("bón")) return "Bón phân: bón theo liều khuyến cáo, tránh bón trước mưa lớn để giảm thất thoát.";
  if (t.includes("kiểm tra bệnh") || t.includes("bệnh")) return "Kiểm tra bệnh: kiểm tra lá/cành, ghi lại ảnh nếu cần và tiến hành cách ly khu vườn nếu phát hiện bệnh lây.";
  return "Xem chi tiết để biết hướng dẫn cụ thể cho khuyến nghị này.";
}
