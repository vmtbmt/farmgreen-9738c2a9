import { useMemo } from "react";
import { CheckCircle2, AlertCircle, ListTodo, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFarmStore } from "@/lib/farm-store";

type Task = { id: string; label: string; kind: "done" | "warn" | "todo" };

export function TodayTasks() {
  const { gardens, logs } = useFarmStore();

  const tasks = useMemo<Task[]>(() => {
    const today = new Date().toISOString().slice(0, 10);
    const now = Date.now();
    const result: Task[] = [];

    // Đã hoàn thành hôm nay
    for (const l of logs) {
      if (l.date === today) {
        const g = gardens.find((x) => x.id === l.gardenId);
        result.push({
          id: `done-${l.id}`,
          label: `${l.type} khu ${g?.name ?? "?"}`,
          kind: "done",
        });
      }
    }

    // Nhắc theo khu vườn
    for (const g of gardens) {
      const gLogs = logs.filter((l) => l.gardenId === g.id);
      const last = gLogs[0];
      if (!last) {
        result.push({
          id: `new-${g.id}`,
          label: `Khu ${g.name} chưa có nhật ký — ghi hoạt động đầu tiên`,
          kind: "warn",
        });
        continue;
      }
      const days = Math.floor((now - new Date(last.date).getTime()) / 86400000);
      const lastWater = gLogs.find((l) => l.type === "Tưới nước");
      const lastFert = gLogs.find((l) => l.type === "Bón phân");
      const lastSpray = gLogs.find((l) => l.type === "Phun thuốc");

      if (!lastWater || (now - new Date(lastWater.date).getTime()) / 86400000 >= 3) {
        result.push({ id: `w-${g.id}`, label: `Kiểm tra tưới nước khu ${g.name}`, kind: "todo" });
      }
      if (lastFert && (now - new Date(lastFert.date).getTime()) / 86400000 >= 30) {
        result.push({ id: `f-${g.id}`, label: `Đến lịch bón phân khu ${g.name}`, kind: "todo" });
      }
      if (lastSpray && (now - new Date(lastSpray.date).getTime()) / 86400000 >= 14) {
        result.push({ id: `s-${g.id}`, label: `Đến lịch phun thuốc khu ${g.name}`, kind: "warn" });
      }
      if (days >= 10) {
        result.push({
          id: `stale-${g.id}`,
          label: `Khu ${g.name} đã ${days} ngày chưa cập nhật`,
          kind: "warn",
        });
      }
    }
    return result.slice(0, 8);
  }, [gardens, logs]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-primary" /> Công việc hôm nay
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Chưa có công việc gợi ý. Thêm khu vườn để bắt đầu.
          </p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((t) => (
              <li
                key={t.id}
                className="flex items-start gap-3 rounded-xl border border-border bg-card/50 p-3"
              >
                {t.kind === "done" ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                ) : t.kind === "warn" ? (
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                ) : (
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-sky-500" />
                )}
                <div className="min-w-0 flex-1">
                  <span className="text-sm">{t.label}</span>
                </div>
                {t.kind === "done" && <Badge variant="secondary">Xong</Badge>}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
