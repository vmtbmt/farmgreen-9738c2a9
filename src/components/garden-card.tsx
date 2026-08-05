import { Link } from "@tanstack/react-router";
import { BookOpen, CalendarDays, ChevronRight, MapPin, NotebookPen, Ruler } from "lucide-react";

import { GardenDeleteButton } from "@/components/garden-delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActivityLog, GardenTask } from "@/lib/farm-store";
import type { Garden } from "@/lib/garden.types";

type GardenStatus = { label: string; dot: string; className: string };

const STATUS_OK: GardenStatus = {
  label: "Bình thường",
  dot: "bg-emerald-500",
  className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};
const STATUS_WATCH: GardenStatus = {
  label: "Cần theo dõi",
  dot: "bg-amber-500",
  className: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
};
const STATUS_LATE: GardenStatus = {
  label: "Quá hạn công việc",
  dot: "bg-destructive",
  className: "border-destructive/40 bg-destructive/10 text-destructive",
};

function getStatus(logs: ActivityLog[], tasks: GardenTask[]): GardenStatus {
  const today = new Date().toISOString().slice(0, 10);
  const open = tasks.filter((t) => t.status !== "Completed" && t.status !== "Archived");
  if (open.some((t) => t.dueDate && t.dueDate < today)) return STATUS_LATE;
  const soon = new Date();
  soon.setDate(soon.getDate() + 3);
  const soonStr = soon.toISOString().slice(0, 10);
  if (open.some((t) => t.dueDate && t.dueDate <= soonStr)) return STATUS_WATCH;
  const latest = logs[0];
  if (!latest) return STATUS_WATCH;
  const days = (Date.now() - new Date(latest.date).getTime()) / 86_400_000;
  if (days > 14) return STATUS_WATCH;
  return STATUS_OK;
}

export function GardenCard({
  garden,
  logs,
  tasks,
}: {
  garden: Garden;
  logs: ActivityLog[];
  tasks: GardenTask[];
}) {
  const gardenLogs = logs.filter((l) => l.gardenId === garden.id);
  const gardenTasks = tasks.filter((t) => t.gardenId === garden.id);
  const latest = gardenLogs[0];
  const status = getStatus(gardenLogs, gardenTasks);

  return (
    <div className="relative">
      <div className="absolute right-3 top-3 z-10">
        <GardenDeleteButton gardenId={garden.id} gardenName={garden.name} />
      </div>

      <Card className="h-full overflow-hidden transition-shadow hover:shadow-lg">
        <div className="h-2 gradient-primary" />
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="truncate text-lg">{garden.name}</CardTitle>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{garden.crop}</Badge>
                <Badge variant="outline" className={`gap-1.5 ${status.className}`}>
                  <span className={`h-2 w-2 rounded-full ${status.dot}`} />
                  {status.label}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="truncate">{garden.location || "Chưa cập nhật vị trí"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4 shrink-0" />
              {garden.area.toLocaleString("vi-VN")} m²
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0" />
              Trồng ngày {new Date(garden.plantedAt).toLocaleDateString("vi-VN")}
            </div>
          </div>

          <div className="rounded-lg border bg-muted/40 p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
              <NotebookPen className="h-4 w-4 text-primary" /> Nhật ký gần nhất
            </div>
            {latest ? (
              <div className="mt-2">
                <p className="truncate font-medium text-foreground">
                  {latest.type}
                  {latest.note ? ` — ${latest.note}` : ""}
                </p>
                <p className="mt-0.5 text-xs">
                  {new Date(latest.date).toLocaleDateString("vi-VN")}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs">Chưa có nhật ký nào cho khu vườn này.</p>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button asChild variant="outline" size="sm" className="justify-start">
              <Link to="/logs/new" search={{ gardenId: garden.id }}>
                <NotebookPen /> Ghi nhật ký
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="justify-start">
              <Link to="/gardens/$gardenId/logs" params={{ gardenId: garden.id }}>
                <BookOpen /> Xem lịch sử
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="justify-start gradient-primary text-primary-foreground sm:col-span-2"
            >
              <Link to="/garden/$gardenId" params={{ gardenId: garden.id }}>
                <ChevronRight /> Mở vườn
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
