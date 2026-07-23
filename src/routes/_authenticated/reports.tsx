import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { FileText, Loader2, Sparkles, TrendingUp, AlertTriangle, Target, Droplets, Leaf as LeafIcon, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateMonthlyReport } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Báo cáo AI — Nông Trại Xanh" },
      { name: "description", content: "Báo cáo tháng do AI tổng hợp từ dữ liệu nông trại." },
      { property: "og:title", content: "Báo cáo AI — Nông Trại Xanh" },
      { property: "og:description", content: "Báo cáo tháng do AI tổng hợp từ dữ liệu nông trại." },
    ],
  }),
  component: ReportsPage,
});

type Report = Awaited<ReturnType<typeof generateMonthlyReport>> | null;

function ReportsPage() {
  const gen = useServerFn(generateMonthlyReport);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Report>(null);

  const run = async () => {
    setLoading(true);
    try { setReport(await gen()); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi tạo báo cáo"); }
    finally { setLoading(false); }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary">
            <FileText className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Báo cáo AI</h1>
            <p className="text-sm text-muted-foreground">Tổng hợp dữ liệu tháng hiện tại.</p>
          </div>
        </div>
        <Button onClick={run} disabled={loading} className="gradient-primary text-primary-foreground">
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang tạo...</> : <><Sparkles className="mr-2 h-4 w-4" /> Tạo báo cáo AI</>}
        </Button>
      </div>

      {!report && !loading && (
        <Card><CardContent className="py-14 text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Bấm "Tạo báo cáo AI" để bắt đầu.</p>
        </CardContent></Card>
      )}

      {report && (
        <div className="space-y-6">
          <div>
            <h2 className="mb-3 text-lg font-semibold">Tổng quan tháng {report.month}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Stat label="Hoạt động" value={report.summary.total_activities} icon={<TrendingUp className="h-4 w-4" />} />
              <Stat label="Tưới nước" value={report.summary.watering} icon={<Droplets className="h-4 w-4" />} />
              <Stat label="Bón phân" value={report.summary.fertilizing} icon={<LeafIcon className="h-4 w-4" />} />
              <Stat label="Phun thuốc" value={report.summary.spraying} icon={<Bug className="h-4 w-4" />} />
              <Stat label="Tổng chi phí" value={`${report.summary.total_cost.toLocaleString("vi-VN")}₫`} icon={<Target className="h-4 w-4" />} />
            </div>
            {report.topGarden && (
              <p className="mt-3 text-sm text-muted-foreground">
                Khu chi phí cao nhất: <span className="font-medium text-foreground">{report.topGarden.name}</span> ({report.topGarden.cost.toLocaleString("vi-VN")}₫)
              </p>
            )}
          </div>

          {report.ai.overview && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Nhận xét tổng quan</CardTitle></CardHeader>
              <CardContent><p className="text-sm leading-relaxed">{report.ai.overview}</p></CardContent>
            </Card>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Điểm bất thường</CardTitle></CardHeader>
              <CardContent><Bullets items={report.ai.observations} empty="Không phát hiện điểm bất thường." /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4 text-amber-500" /> Rủi ro</CardTitle></CardHeader>
              <CardContent><Bullets items={report.ai.risks} empty="Chưa phát hiện rủi ro." /></CardContent>
            </Card>
          </div>

          <Card className="border-primary/40 bg-primary/5">
            <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Khuyến nghị tháng tới</CardTitle></CardHeader>
            <CardContent><Bullets items={report.ai.recommendations} empty="Chưa có khuyến nghị." /></CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <Card><CardContent className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon} {label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </CardContent></Card>
  );
}

function Bullets({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="space-y-2 text-sm">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2"><span className="text-primary">•</span><span>{t}</span></li>
      ))}
    </ul>
  );
}
