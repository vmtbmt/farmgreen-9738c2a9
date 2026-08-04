import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  FileText, Loader2, Sparkles, TrendingUp, AlertTriangle, Target,
  Droplets, Leaf as LeafIcon, Bug, Download, History, Trash2, Eye,
} from "lucide-react";
import { AiWorkspaceTabs } from "@/components/ai-workspace-tabs";
import { Button } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { generateMonthlyReport, listReports, deleteReport } from "@/lib/ai.functions";

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

type Report = Awaited<ReturnType<typeof generateMonthlyReport>>;
type ReportListItem = Awaited<ReturnType<typeof listReports>>[number];

function ReportsPage() {
  const gen = useServerFn(generateMonthlyReport);
  const list = useServerFn(listReports);
  const del = useServerFn(deleteReport);

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [history, setHistory] = useState<ReportListItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try { setHistory(await list()); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi tải lịch sử"); }
    finally { setHistoryLoading(false); }
  };

  useEffect(() => { loadHistory(); /* eslint-disable-next-line */ }, []);

  const run = async () => {
    setLoading(true);
    try {
      const r = await gen();
      setReport(r);
      toast.success("Đã tạo báo cáo và lưu vào lịch sử");
      loadHistory();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi tạo báo cáo"); }
    finally { setLoading(false); }
  };

  const onDelete = async (id: string) => {
    try {
      await del({ data: { id } });
      toast.success("Đã xóa báo cáo");
      setHistory((h) => h.filter((r) => r.id !== id));
      if (report && "id" in report && (report as any).id === id) setReport(null);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi xóa"); }
  };

  const exportExcel = (r: Report | ReportListItem) => {
    const wb = XLSX.utils.book_new();
    const overview = [
      ["Báo cáo tháng", r.month],
      ["Tổng hoạt động", r.summary.total_activities],
      ["Tưới nước", r.summary.watering],
      ["Bón phân", r.summary.fertilizing],
      ["Phun thuốc", r.summary.spraying],
      ["Tổng chi phí (VND)", r.summary.total_cost],
      ["Khu chi phí cao nhất", r.topGarden ? `${r.topGarden.name} (${r.topGarden.cost.toLocaleString("vi-VN")}₫)` : "—"],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(overview), "Tổng quan");

    const ai = [
      ["Nhận xét tổng quan"], [r.ai.overview || "—"], [],
      ["Điểm bất thường"], ...(r.ai.observations.length ? r.ai.observations.map((s) => [s]) : [["—"]]), [],
      ["Rủi ro"], ...(r.ai.risks.length ? r.ai.risks.map((s) => [s]) : [["—"]]), [],
      ["Khuyến nghị"], ...(r.ai.recommendations.length ? r.ai.recommendations.map((s) => [s]) : [["—"]]),
    ];
    const aiSheet = XLSX.utils.aoa_to_sheet(ai);
    aiSheet["!cols"] = [{ wch: 90 }];
    XLSX.utils.book_append_sheet(wb, aiSheet, "Phân tích AI");

    XLSX.writeFile(wb, `bao-cao-${r.month}.xlsx`);
    toast.success("Đã xuất file Excel");
  };

  return (
    <div>
      <AiWorkspaceTabs activeTab="reports" />
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
          <p className="mt-3 text-sm text-muted-foreground">Bấm "Tạo báo cáo AI" để bắt đầu, hoặc mở lại một báo cáo trong lịch sử bên dưới.</p>
        </CardContent></Card>
      )}

      {report && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Tổng quan tháng {report.month}</h2>
            <Button variant="outline" size="sm" onClick={() => exportExcel(report)}>
              <Download className="mr-2 h-4 w-4" /> Xuất Excel
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Hoạt động" value={report.summary.total_activities} icon={<TrendingUp className="h-4 w-4" />} />
            <Stat label="Tưới nước" value={report.summary.watering} icon={<Droplets className="h-4 w-4" />} />
            <Stat label="Bón phân" value={report.summary.fertilizing} icon={<LeafIcon className="h-4 w-4" />} />
            <Stat label="Phun thuốc" value={report.summary.spraying} icon={<Bug className="h-4 w-4" />} />
            <Stat label="Tổng chi phí" value={`${report.summary.total_cost.toLocaleString("vi-VN")}₫`} icon={<Target className="h-4 w-4" />} />
          </div>
          {report.topGarden && (
            <p className="text-sm text-muted-foreground">
              Khu chi phí cao nhất: <span className="font-medium text-foreground">{report.topGarden.name}</span> ({report.topGarden.cost.toLocaleString("vi-VN")}₫)
            </p>
          )}

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" /> Lịch sử báo cáo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có báo cáo nào được lưu.</p>
          ) : (
            <ul className="divide-y divide-border">
              {history.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">{r.title || `Báo cáo tháng ${r.month}`}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("vi-VN")} · {r.summary.total_activities} hoạt động · {r.summary.total_cost.toLocaleString("vi-VN")}₫
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => { setReport(r as unknown as Report); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                      <Eye className="h-4 w-4" /> Xem
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => exportExcel(r)}>
                      <Download className="h-4 w-4" /> Excel
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" /> Xóa
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Xóa báo cáo này?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Hành động này không thể hoàn tác. Báo cáo "{r.title || r.month}" sẽ bị xóa vĩnh viễn.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Hủy</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(r.id)}>Xóa</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
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
