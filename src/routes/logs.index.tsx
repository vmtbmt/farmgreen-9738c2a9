import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { NotebookPen, Plus, Trash2, Filter, Calendar } from "lucide-react";
import { toast } from "sonner";

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
import { ACTIVITY_TYPES, farmActions, useFarmStore } from "@/lib/farm-store";

export const Route = createFileRoute("/logs")({
  head: () => ({
    meta: [
      { title: "Lịch sử hoạt động — Nông Trại Xanh" },
      { name: "description", content: "Xem lịch sử toàn bộ hoạt động trên nông trại." },
      { property: "og:title", content: "Lịch sử hoạt động — Nông Trại Xanh" },
      { property: "og:description", content: "Toàn bộ nhật ký chăm sóc nông trại." },
    ],
  }),
  component: LogsPage,
});

function LogsPage() {
  const { gardens, logs } = useFarmStore();
  const [gardenFilter, setGardenFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const gardenById = useMemo(() => new Map(gardens.map((g) => [g.id, g])), [gardens]);

  const filtered = useMemo(() => {
    return logs
      .filter((l) => (gardenFilter === "all" ? true : l.gardenId === gardenFilter))
      .filter((l) => (typeFilter === "all" ? true : l.type === typeFilter))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [logs, gardenFilter, typeFilter]);

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
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lịch sử hoạt động</h1>
          <p className="mt-1 text-muted-foreground">
            Toàn bộ nhật ký chăm sóc và canh tác trên nông trại.
          </p>
        </div>
        <Button asChild className="gradient-primary text-primary-foreground">
          <Link to="/logs/new">
            <Plus /> Ghi nhật ký
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" /> Lọc:
          </div>
          <Select value={gardenFilter} onValueChange={setGardenFilter}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Khu vườn" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả khu vườn</SelectItem>
              {gardens.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Hoạt động" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả hoạt động</SelectItem>
              {ACTIVITY_TYPES.map((t) => (
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

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary text-primary-foreground">
              <NotebookPen className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Chưa có nhật ký nào</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Hãy ghi lại các hoạt động chăm sóc để theo dõi tiến độ canh tác.
            </p>
            <Button asChild className="mt-6 gradient-primary text-primary-foreground">
              <Link to="/logs/new">
                <Plus /> Ghi nhật ký đầu tiên
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
                {items.map((l) => {
                  const g = gardenById.get(l.gardenId);
                  return (
                    <div key={l.id} className="relative">
                      <span className="absolute -left-[27px] top-3 h-3 w-3 rounded-full gradient-primary ring-4 ring-background" />
                      <Card>
                        <CardContent className="flex items-start justify-between gap-4 p-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold">{l.type}</span>
                              <Badge variant="secondary">{g?.name ?? "Khu đã xoá"}</Badge>
                              {g?.crop && <Badge variant="outline">{g.crop}</Badge>}
                            </div>
                            {l.note ? (
                              <p className="mt-2 text-sm text-foreground/80">{l.note}</p>
                            ) : (
                              <p className="mt-2 text-sm italic text-muted-foreground">
                                Không có ghi chú.
                              </p>
                            )}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              farmActions.deleteLog(l.id);
                              toast.success("Đã xoá nhật ký.");
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
