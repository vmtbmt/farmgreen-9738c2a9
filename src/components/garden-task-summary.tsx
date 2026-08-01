import { Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, ClipboardList, ListTodo, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGardenTasks } from "@/lib/farm-store";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  formatDueDate,
  isOverdue,
  isTaskOpen,
  sortTasksDefault,
  summarizeTasks,
} from "@/lib/garden-task-utils";

export function GardenTaskSummary({ gardenId }: { gardenId: string }) {
  const query = useGardenTasks(gardenId);
  const tasks = query.data ?? [];
  const stats = summarizeTasks(tasks);
  const upcoming = sortTasksDefault(tasks.filter(isTaskOpen)).slice(0, 4);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {query.isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          : [
              {
                icon: <ClipboardList className="h-5 w-5" />,
                label: "Tổng công việc",
                value: stats.total,
              },
              {
                icon: <CheckCircle2 className="h-5 w-5" />,
                label: "Hoàn thành",
                value: stats.completed,
              },
              { icon: <ListTodo className="h-5 w-5" />, label: "Còn lại", value: stats.pending },
              {
                icon: <AlertTriangle className="h-5 w-5" />,
                label: "Quá hạn",
                value: stats.overdue,
                danger: true,
              },
            ].map((item) => (
              <Card key={item.label}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div
                    className={
                      item.danger && item.value > 0
                        ? "flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive"
                        : "flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"
                    }
                  >
                    {item.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">{item.label}</div>
                    <div className="text-xl font-semibold">{item.value}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Công việc sắp tới</CardTitle>
          <Button asChild size="sm" variant="ghost">
            <Link to="/gardens/$gardenId/tasks" params={{ gardenId }}>
              Xem tất cả
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 rounded-lg" />
              <Skeleton className="h-14 rounded-lg" />
            </div>
          ) : upcoming.length === 0 ? (
            <div className="rounded-lg border border-dashed py-8 text-center">
              <p className="font-medium">Chưa có công việc nào</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tạo công việc để theo dõi việc cần làm cho khu vườn này.
              </p>
              <Button asChild className="mt-4" size="sm">
                <Link to="/gardens/$gardenId/tasks" params={{ gardenId }}>
                  <Plus /> Tạo công việc
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((task) => (
                <div
                  key={task.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{task.title}</div>
                    <p className="text-sm text-muted-foreground">
                      {STATUS_LABELS[task.status] ?? task.status} ·{" "}
                      {PRIORITY_LABELS[task.priority] ?? task.priority} ·{" "}
                      {formatDueDate(task.dueDate)}
                    </p>
                  </div>
                  {isOverdue(task) && <Badge variant="destructive">Quá hạn</Badge>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
