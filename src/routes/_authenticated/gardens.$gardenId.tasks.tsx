import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Check, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { GardenWorkspaceTabs } from "@/components/garden-workspace-tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  type GardenTask,
  type GardenTaskInput,
  useFarmActions,
  useGardenTasks,
} from "@/lib/farm-store";
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  formatDueDate,
  isOverdue,
  isTaskOpen,
  sortTasksDefault,
  summarizeTasks,
} from "@/lib/garden-task-utils";

export const Route = createFileRoute("/_authenticated/gardens/$gardenId/tasks")({
  head: () => ({ meta: [{ title: "Công việc khu vườn — Nông Trại Xanh" }] }),
  component: TasksPage,
});

function TasksPage() {
  const { gardenId } = Route.useParams();
  const query = useGardenTasks(gardenId);
  const actions = useFarmActions();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("default");
  const [edit, setEdit] = useState<GardenTask | undefined>();
  const [busyId, setBusyId] = useState<string | null>(null);

  const all = useMemo(() => query.data ?? [], [query.data]);
  const stats = summarizeTasks(all);
  const tasks = useMemo(() => {
    const filtered = all.filter(
      (t) =>
        (status === "all" ? t.status !== "Archived" : t.status === status) &&
        `${t.title} ${t.description}`.toLowerCase().includes(search.trim().toLowerCase()),
    );
    if (sort === "priority" || sort === "due" || sort === "created") {
      return [...filtered].sort((x, y) =>
        sort === "priority"
          ? TASK_PRIORITIES.indexOf(y.priority as never) -
            TASK_PRIORITIES.indexOf(x.priority as never)
          : sort === "created"
            ? y.createdAt.localeCompare(x.createdAt)
            : (x.dueDate ?? "9999-12-31").localeCompare(y.dueDate ?? "9999-12-31"),
      );
    }
    return sortTasksDefault(filtered);
  }, [all, search, sort, status]);

  const complete = async (task: GardenTask) => {
    setBusyId(task.id);
    try {
      await actions.updateGardenTask(task.id, { ...task, status: "Completed" });
      toast.success("Đã đánh dấu hoàn thành.");
    } catch (error) {
      toast.error(`Không thể cập nhật: ${(error as Error).message}`);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (task: GardenTask) => {
    setBusyId(task.id);
    try {
      await actions.deleteGardenTask(task.id, gardenId);
      toast.success("Đã xóa công việc.");
    } catch (error) {
      toast.error(`Không thể xóa: ${(error as Error).message}`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 overflow-x-hidden p-4 sm:p-6">
      <Button asChild size="sm" variant="ghost">
        <Link to="/gardens/$gardenId" params={{ gardenId }}>
          <ArrowLeft className="h-4 w-4" /> Tổng quan vườn
        </Link>
      </Button>
      <GardenWorkspaceTabs gardenId={gardenId} activeTab="tasks" />

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Công việc</h1>
          <p className="text-sm text-muted-foreground">Quản lý việc cần làm cho khu vườn này.</p>
        </div>
        <Button
          size="lg"
          className="gradient-primary text-primary-foreground"
          onClick={() => setEdit({} as GardenTask)}
        >
          <Plus /> Tạo công việc
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatBox label="Tổng công việc" value={stats.total} />
        <StatBox label="Hoàn thành" value={stats.completed} />
        <StatBox label="Còn lại" value={stats.pending} />
        <StatBox label="Quá hạn" value={stats.overdue} danger />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm công việc..."
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {TASK_STATUSES.map((x) => (
              <SelectItem key={x} value={x}>
                {STATUS_LABELS[x]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Sắp xếp mặc định</SelectItem>
            <SelectItem value="due">Hạn hoàn thành</SelectItem>
            <SelectItem value="priority">Ưu tiên</SelectItem>
            <SelectItem value="created">Mới tạo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {query.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : query.isError ? (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardContent className="space-y-3 p-6 text-center">
            <p>Không tải được danh sách công việc.</p>
            <Button variant="outline" onClick={() => query.refetch()}>
              Thử lại
            </Button>
          </CardContent>
        </Card>
      ) : tasks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center">
            <p className="font-medium">Chưa có công việc phù hợp</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tạo công việc đầu tiên để bắt đầu theo dõi tiến độ chăm sóc vườn.
            </p>
            <Button className="mt-4" size="lg" onClick={() => setEdit({} as GardenTask)}>
              <Plus /> Tạo công việc
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => (
            <Card key={t.id}>
              <CardContent className="flex flex-wrap items-center gap-3 p-4">
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="Đánh dấu hoàn thành"
                  disabled={!isTaskOpen(t) || busyId === t.id}
                  onClick={() => complete(t)}
                >
                  <Check />
                </Button>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{t.title}</div>
                  <p className="text-sm text-muted-foreground">
                    {CATEGORY_LABELS[t.category] ?? t.category} ·{" "}
                    {PRIORITY_LABELS[t.priority] ?? t.priority} · Hạn {formatDueDate(t.dueDate)}
                  </p>
                  {t.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-foreground/80">{t.description}</p>
                  )}
                </div>
                {isOverdue(t) && <Badge variant="destructive">Quá hạn</Badge>}
                <Badge variant="secondary">{STATUS_LABELS[t.status] ?? t.status}</Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Chỉnh sửa"
                  onClick={() => setEdit(t)}
                >
                  <Pencil />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" aria-label="Xóa" disabled={busyId === t.id}>
                      <Trash2 />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Xóa “{t.title}”?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Công việc sẽ bị xóa vĩnh viễn và không thể khôi phục.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Huỷ</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => remove(t)}
                      >
                        Xóa
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TaskDialog task={edit} gardenId={gardenId} onClose={() => setEdit(undefined)} />
    </div>
  );
}

function StatBox({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div
          className={
            danger && value > 0 ? "text-2xl font-bold text-destructive" : "text-2xl font-bold"
          }
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

type TaskForm = {
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  dueDate: string;
  reminderAt: string | null;
  notes: string;
};

function TaskDialog({
  task,
  gardenId,
  onClose,
}: {
  task?: GardenTask;
  gardenId: string;
  onClose: () => void;
}) {
  const actions = useFarmActions();
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState<TaskForm>(() => ({
    title: task?.title ?? "",
    description: task?.description ?? "",
    category: task?.category ?? "Other",
    priority: task?.priority ?? "Medium",
    status: task?.status ?? "Todo",
    dueDate: task?.dueDate ?? "",
    reminderAt: task?.reminderAt ?? null,
    notes: task?.notes ?? "",
  }));
  if (!task) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.title.trim()) return toast.error("Vui lòng nhập tiêu đề công việc.");
    const input: GardenTaskInput = {
      gardenId,
      title: f.title.trim(),
      description: f.description,
      category: f.category,
      priority: f.priority,
      status: f.status,
      dueDate: f.dueDate || null,
      reminderAt: f.reminderAt || null,
      notes: f.notes,
    };
    setSaving(true);
    try {
      if (task.id) await actions.updateGardenTask(task.id, input);
      else await actions.addGardenTask(input);
      toast.success("Đã lưu công việc.");
      onClose();
    } catch (error) {
      toast.error(`Không thể lưu: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task.id ? "Chỉnh sửa công việc" : "Tạo công việc"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Tiêu đề *</Label>
            <Input
              id="task-title"
              value={f.title}
              onChange={(e) => setF({ ...f, title: e.target.value })}
              placeholder="Ví dụ: Bón phân đợt 2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-desc">Mô tả</Label>
            <Textarea
              id="task-desc"
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
              placeholder="Mô tả chi tiết công việc"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Loại công việc</Label>
              <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_CATEGORIES.map((x) => (
                    <SelectItem key={x} value={x}>
                      {CATEGORY_LABELS[x]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mức ưu tiên</Label>
              <Select value={f.priority} onValueChange={(v) => setF({ ...f, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((x) => (
                    <SelectItem key={x} value={x}>
                      {PRIORITY_LABELS[x]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Trạng thái</Label>
              <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((x) => (
                    <SelectItem key={x} value={x}>
                      {STATUS_LABELS[x]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-due">Hạn hoàn thành</Label>
              <Input
                id="task-due"
                type="date"
                value={f.dueDate}
                onChange={(e) => setF({ ...f, dueDate: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-notes">Ghi chú</Label>
            <Textarea
              id="task-notes"
              value={f.notes}
              onChange={(e) => setF({ ...f, notes: e.target.value })}
              placeholder="Ghi chú thêm"
            />
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={saving}
            className="w-full gradient-primary text-primary-foreground"
          >
            {saving ? "Đang lưu..." : "Lưu công việc"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
