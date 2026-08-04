import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Calendar, NotebookPen, Filter, Wallet } from "lucide-react";

import { GardenWorkspaceTabs } from "@/components/garden-workspace-tabs";
import { Button } from "@/components/ui/button";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFarmStore } from "@/lib/farm-store";

const FILTER_TYPES = ["Bón phân", "Tưới nước", "Phun thuốc", "Thu hoạch"] as const;

export const Route = createFileRoute("/_authenticated/gardens/$gardenId/logs")({
  head: () => ({
    meta: [
      { title: "Lịch sử nhật ký khu vườn — Nông Trại Xanh" },
      { name: "description", content: "Xem lịch sử nhật ký hoạt động của khu vườn." },
      { property: "og:title", content: "Lịch sử nhật ký khu vườn — Nông Trại Xanh" },
      { property: "og:description", content: "Timeline hoạt động chi tiết theo từng khu vườn." },
    ],
  }),
  component: GardenLogsPage,
});

function GardenLogsPage() {
  const { gardenId } = Route.useParams();
  const { gardens, logs, isLoading } = useFarmStore();
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const garden = gardens.find((g) => g.id === gardenId);

  const gardenLogs = useMemo(
    () =>
      logs
        .filter((l) => l.gardenId === gardenId)
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [logs, gardenId],
  );

  const filtered = useMemo(
    () =>
      typeFilter === "all"
        ? gardenLogs
        : gardenLogs.filter((l) => l.type === typeFilter),
    [gardenLogs, typeFilter],
  );

  const totalCost = gardenLogs.reduce((s, l) => s + (l.cost || 0), 0);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const l of filtered) {
      const arr = map.get(l.date) ?? [];
      arr.push(l);
      map.set(l.date, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="mx-auto w-full max-w-4xl min-w-0 space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild size="sm" variant="ghost">
          <Link to="/gardens">
            <ArrowLeft className="h-4 w-4" /> Khu vườn
          </Link>
        </Button>
      </div>

      <GardenWorkspaceTabs gardenId={gardenId} activeTab="logs" />


      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Lịch sử nhật ký{garden ? ` — ${garden.name}` : ""}
        </h1>
        {garden && (
          <p className="text-sm text-muted-foreground">
            {garden.crop} · {garden.area.toLocaleString("vi-VN")} m²
            {garden.location ? ` · ${garden.location}` : ""}
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary text-primary-foreground">
              <NotebookPen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Tổng số nhật ký</div>
              <div className="text-xl font-semibold">{gardenLogs.length}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary text-primary-foreground">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Tổng chi phí</div>
              <div className="truncate text-xl font-semibold">
                {totalCost.toLocaleString("vi-VN")}₫
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" /> Lọc:
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Loại hoạt động" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả hoạt động</SelectItem>
              {FILTER_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto text-sm text-muted-foreground">
            {filtered.length} bản ghi
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Đang tải...
          </CardContent>
        </Card>
      ) : !garden ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Không tìm thấy khu vườn này.
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <NotebookPen className="h-8 w-8 text-muted-foreground" />
            <h3 className="mt-3 text-base font-semibold">Chưa có nhật ký nào</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Ghi nhật ký để bắt đầu theo dõi hoạt động của khu vườn này.
            </p>
            <Button asChild className="mt-5 gradient-primary text-primary-foreground">
              <Link to="/logs/new" search={{ gardenId }}>
                Ghi nhật ký
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([date, items]) => (
            <div key={date}>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Calendar className="h-4 w-4 text-primary" />
                {new Date(date).toLocaleDateString("vi-VN", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
              <div className="relative space-y-3 border-l-2 border-border pl-5">
                {items.map((l) => (
                  <div key={l.id} className="relative">
                    <span className="absolute -left-[27px] top-3 h-3 w-3 rounded-full gradient-primary ring-4 ring-background" />
                    <Card>
                      <CardContent className="space-y-2 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{l.type}</span>
                          <Badge variant="outline">
                            {new Date(l.date).toLocaleDateString("vi-VN")}
                          </Badge>
                          {l.cost > 0 && (
                            <Badge className="ml-auto bg-primary/15 text-primary hover:bg-primary/20">
                              {l.cost.toLocaleString("vi-VN")}₫
                            </Badge>
                          )}
                        </div>
                        {l.note ? (
                          <p className="text-sm text-foreground/80 break-words">{l.note}</p>
                        ) : (
                          <p className="text-sm italic text-muted-foreground">
                            Không có mô tả.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
