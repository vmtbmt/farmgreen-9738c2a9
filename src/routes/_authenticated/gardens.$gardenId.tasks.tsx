import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { GardenWorkspaceTabs } from "@/components/garden-workspace-tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  type GardenTask,
  type GardenTaskInput,
  useFarmActions,
  useGardenTasks,
} from "@/lib/farm-store";
const categories = [
  "Watering",
  "Fertilizer",
  "Pruning",
  "Disease",
  "Harvest",
  "Cleaning",
  "Inspection",
  "Other",
];
const priorities = ["Low", "Medium", "High", "Urgent"];
const statuses = ["Todo", "In Progress", "Completed", "Archived"];
export const Route = createFileRoute("/_authenticated/gardens/$gardenId/tasks")({
  component: TasksPage,
});
function TasksPage() {
  const { gardenId } = Route.useParams();
  const q = useGardenTasks(gardenId);
  const a = useFarmActions();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("due");
  const [edit, setEdit] = useState<GardenTask | undefined>();
  const tasks = useMemo(
    () =>
      [...(q.data ?? [])]
        .filter(
          (t) =>
            (status === "all" || t.status === status) &&
            `${t.title} ${t.description}`.toLowerCase().includes(search.toLowerCase()),
        )
        .sort((x, y) =>
          sort === "priority"
            ? priorities.indexOf(y.priority) - priorities.indexOf(x.priority)
            : sort === "created"
              ? y.createdAt.localeCompare(x.createdAt)
              : (x.dueDate ?? "9999").localeCompare(y.dueDate ?? "9999"),
        ),
    [q.data, search, status, sort],
  );
  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <GardenWorkspaceTabs gardenId={gardenId} activeTab="tasks" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Công việc</h1>
          <p className="text-sm text-muted-foreground">Quản lý công việc cho khu vườn này.</p>
        </div>
        <Button onClick={() => setEdit({} as GardenTask)}>
          <Plus /> Tạo công việc
        </Button>
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
            {statuses.map((x) => (
              <SelectItem key={x} value={x}>
                {x}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="due">Hạn hoàn thành</SelectItem>
            <SelectItem value="priority">Ưu tiên</SelectItem>
            <SelectItem value="created">Mới tạo</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {q.isLoading ? (
        <Card>
          <CardContent className="p-8 text-center">Đang tải...</CardContent>
        </Card>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            Chưa có công việc phù hợp.
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
                  disabled={t.status === "Completed" || t.status === "Archived"}
                  onClick={() =>
                    a
                      .updateGardenTask(t.id, { ...t, status: "Completed" })
                      .then(() => toast.success("Đã hoàn thành"))
                  }
                >
                  <Check />
                </Button>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{t.title}</div>
                  <p className="text-sm text-muted-foreground">
                    {t.category} · {t.priority}
                    {t.dueDate ? ` · Hạn ${new Date(t.dueDate).toLocaleDateString("vi-VN")}` : ""}
                  </p>
                </div>
                <span className="rounded-full bg-muted px-2 py-1 text-xs">{t.status}</span>
                <Button size="icon" variant="ghost" onClick={() => setEdit(t)}>
                  <Pencil />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    a.archiveGardenTask(t.id, gardenId).then(() => toast.success("Đã lưu trữ"))
                  }
                >
                  <Trash2 />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    confirm("Xóa công việc này?") &&
                    a.deleteGardenTask(t.id, gardenId).then(() => toast.success("Đã xóa"))
                  }
                >
                  Xóa
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <TaskDialog task={edit} gardenId={gardenId} onClose={() => setEdit(undefined)} />
    </div>
  );
}
function TaskDialog({
  task,
  gardenId,
  onClose,
}: {
  task?: GardenTask;
  gardenId: string;
  onClose: () => void;
}) {
  const a = useFarmActions();
  const [f, setF] = useState<any>(() =>
    task
      ? { ...task }
      : {
          title: "",
          description: "",
          category: "Other",
          priority: "Medium",
          status: "Todo",
          dueDate: "",
          reminderAt: "",
          notes: "",
        },
  );
  if (!task) return null;
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.title.trim()) return toast.error("Nhập tiêu đề công việc");
    const input: GardenTaskInput = {
      gardenId,
      title: f.title,
      description: f.description,
      category: f.category,
      priority: f.priority,
      status: f.status,
      dueDate: f.dueDate || null,
      reminderAt: f.reminderAt || null,
      notes: f.notes,
    };
    try {
      task.id ? await a.updateGardenTask(task.id, input) : await a.addGardenTask(input);
      toast.success("Đã lưu công việc");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task.id ? "Chỉnh sửa công việc" : "Tạo công việc"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <Input
            value={f.title}
            onChange={(e) => setF({ ...f, title: e.target.value })}
            placeholder="Tiêu đề *"
          />
          <Textarea
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value })}
            placeholder="Mô tả"
          />
          <div className="grid grid-cols-2 gap-3">
            <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((x) => (
                  <SelectItem key={x} value={x}>
                    {x}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={f.priority} onValueChange={(v) => setF({ ...f, priority: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorities.map((x) => (
                  <SelectItem key={x} value={x}>
                    {x}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((x) => (
                <SelectItem key={x} value={x}>
                  {x}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={f.dueDate ?? ""}
            onChange={(e) => setF({ ...f, dueDate: e.target.value })}
          />
          <Input
            type="datetime-local"
            value={f.reminderAt ? f.reminderAt.slice(0, 16) : ""}
            onChange={(e) =>
              setF({
                ...f,
                reminderAt: e.target.value ? new Date(e.target.value).toISOString() : null,
              })
            }
          />
          <Textarea
            value={f.notes}
            onChange={(e) => setF({ ...f, notes: e.target.value })}
            placeholder="Ghi chú"
          />
          <Button type="submit">Lưu công việc</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
