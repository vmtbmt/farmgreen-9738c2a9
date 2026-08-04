import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Archive,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Edit3,
  HeartPulse,
  ListTodo,
  MapPin,
  NotebookPen,
  ReceiptText,
  Ruler,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { GardenFormDialog } from "@/components/garden-form-dialog";
import { GardenTaskSummary } from "@/components/garden-task-summary";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDiseaseChecks, useFarmActions, useFarmStore, useGardenTasks } from "@/lib/farm-store";
import { summarizeTasks } from "@/lib/garden-task-utils";

export const Route = createFileRoute("/_authenticated/gardens/$gardenId")({
  head: () => ({ meta: [{ title: "Chi tiết khu vườn — Nông Trại Xanh" }] }),
  component: Outlet,
});

export function GardenDetailPage() {
  const { gardenId } = Route.useParams();
  const navigate = useNavigate();
  const { gardens, logs, isLoading } = useFarmStore();
  const diseaseChecks = useDiseaseChecks();
  const actions = useFarmActions();
  const tasksQuery = useGardenTasks(gardenId);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const garden = gardens.find((item) => item.id === gardenId);
  const gardenLogs = useMemo(
    () => logs.filter((item) => item.gardenId === gardenId),
    [gardenId, logs],
  );
  const gardenChecks = useMemo(
    () => (diseaseChecks.data ?? []).filter((item) => item.gardenId === gardenId),
    [diseaseChecks.data, gardenId],
  );
  const taskStats = summarizeTasks(tasksQuery.data ?? []);
  const recentLogs = useMemo(
    () =>
      [...gardenLogs]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5),
    [gardenLogs],
  );
  const canDelete = gardenLogs.length === 0 && gardenChecks.length === 0;

  const archive = async () => {
    setIsArchiving(true);
    try {
      await actions.archiveGarden(gardenId);
      toast.success("Đã lưu trữ khu vườn.");
      navigate({ to: "/gardens" });
    } catch (error) {
      toast.error(`Không thể lưu trữ khu vườn: ${(error as Error).message}`);
    } finally {
      setIsArchiving(false);
    }
  };

  const remove = async () => {
    setIsDeleting(true);
    try {
      await actions.deleteGarden(gardenId);
      toast.success("Đã xóa khu vườn.");
      navigate({ to: "/gardens" });
    } catch (error) {
      toast.error(`Không thể xóa khu vườn: ${(error as Error).message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading || tasksQuery.isLoading)
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4 p-4 sm:p-6">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  if (!garden) return <NotFoundGarden />;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <Button asChild size="sm" variant="ghost">
        <Link to="/gardens">
          <ArrowLeft className="h-4 w-4" /> Khu vườn
        </Link>
      </Button>
      <GardenWorkspaceTabs gardenId={gardenId} activeTab="overview" />
      <Card className="overflow-hidden">
        <div className="h-2 gradient-primary" />
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{garden.name}</h1>
                <Badge variant="secondary">{garden.crop}</Badge>
                <Badge variant={garden.archivedAt ? "outline" : "default"}>
                  {garden.archivedAt ? "Đã lưu trữ" : "Đang canh tác"}
                </Badge>
              </div>
              <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                <span className="flex items-center gap-2">
                  <Ruler className="h-4 w-4" />
                  {garden.area.toLocaleString("vi-VN")} m²
                </span>
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {garden.location || "Chưa cập nhật vị trí"}
                </span>
                <span className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Trồng ngày {new Date(garden.plantedAt).toLocaleDateString("vi-VN")}
                </span>
              </div>
              {garden.notes && (
                <p className="mt-4 whitespace-pre-wrap text-sm text-foreground/80">
                  {garden.notes}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(true)}>
                <Edit3 /> Chỉnh sửa
              </Button>
              <Button asChild className="gradient-primary text-primary-foreground">
                <Link to="/logs/new" search={{ gardenId }}>
                  <NotebookPen /> Ghi nhật ký
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <section aria-labelledby="overview-heading" className="space-y-3">
        <h2 id="overview-heading" className="text-lg font-semibold">
          Tổng quan
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<NotebookPen className="h-5 w-5" />}
            label="Tổng hoạt động"
            value={gardenLogs.length.toLocaleString("vi-VN")}
          />
          <StatCard
            icon={<ClipboardList className="h-5 w-5" />}
            label="Tổng công việc"
            value={taskStats.total.toLocaleString("vi-VN")}
          />
          <StatCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Hoàn thành"
            value={taskStats.completed.toLocaleString("vi-VN")}
          />
          <StatCard
            icon={<ListTodo className="h-5 w-5" />}
            label="Đang chờ"
            value={taskStats.pending.toLocaleString("vi-VN")}
          />
        </div>
      </section>

      <section aria-labelledby="quick-actions-heading">
        <Card>
          <CardHeader>
            <CardTitle id="quick-actions-heading" className="text-lg">
              Thao tác nhanh
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <Button asChild className="gradient-primary text-primary-foreground">
              <Link to="/logs/new" search={{ gardenId }}>
                <NotebookPen /> Ghi nhật ký
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/gardens/$gardenId/logs" params={{ gardenId }}>
                <ClipboardList /> Xem nhật ký
              </Link>
            </Button>
            <Button variant="outline" onClick={() => setIsEditOpen(true)}>
              <Edit3 /> Chỉnh sửa vườn
            </Button>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <HeartPulse className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Tình trạng cây trồng</CardTitle>
          </CardHeader>
          <CardContent>
            {gardenChecks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Chưa có kết quả chẩn đoán nào cho khu vườn này.
              </p>
            ) : (
              <div className="space-y-1">
                <div className="font-medium">{gardenChecks[0].diagnosis || "Chưa có kết luận"}</div>
                <p className="text-sm text-muted-foreground">
                  Mức độ: {gardenChecks[0].urgency} · {gardenChecks.length} lần chẩn đoán
                </p>
              </div>
            )}
            <Button asChild className="mt-4" size="sm" variant="outline">
              <Link to="/diagnose">Chẩn đoán bệnh cây</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <ReceiptText className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Tóm tắt chi phí</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Tổng chi phí đã ghi nhận</p>
            <p className="text-3xl font-bold">
              {gardenLogs.reduce((sum, log) => sum + log.cost, 0).toLocaleString("vi-VN")}₫
            </p>
            <Button asChild className="mt-4" size="sm" variant="outline">
              <Link to="/gardens/$gardenId/expenses" params={{ gardenId }}>
                <ReceiptText /> Xem chi phí
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <section aria-labelledby="tasks-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="tasks-heading" className="text-lg font-semibold">
            Công việc
          </h2>
          <Button asChild size="sm" variant="outline">
            <Link to="/gardens/$gardenId/tasks" params={{ gardenId }}>
              <ClipboardList /> Quản lý công việc
            </Link>
          </Button>
        </div>
        <GardenTaskSummary gardenId={gardenId} />
      </section>


      <section aria-labelledby="recent-activity-heading">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle id="recent-activity-heading" className="text-lg">
              Hoạt động gần đây
            </CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link to="/gardens/$gardenId/logs" params={{ gardenId }}>
                Xem tất cả
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Chưa có hoạt động nào trong khu vườn này.
                </p>
                <Button asChild className="mt-4" size="sm">
                  <Link to="/logs/new" search={{ gardenId }}>
                    Ghi nhật ký đầu tiên
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                  >
                    <div>
                      <div className="font-medium">{log.type}</div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(log.date).toLocaleDateString("vi-VN")}
                        {log.note ? ` · ${log.note}` : ""}
                      </p>
                    </div>
                    {log.cost > 0 && (
                      <Badge variant="outline">{log.cost.toLocaleString("vi-VN")}₫</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quản lý khu vườn</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Lưu trữ sẽ ẩn khu vườn khỏi danh sách nhưng không xóa dữ liệu.
          </p>
          <div className="flex flex-wrap gap-2">
            <ConfirmAction
              title={`Lưu trữ “${garden.name}”?`}
              description="Bạn có thể giữ lại toàn bộ nhật ký và dữ liệu của khu vườn này."
              actionLabel={isArchiving ? "Đang lưu trữ..." : "Lưu trữ"}
              onAction={archive}
              disabled={isArchiving}
              variant="outline"
              icon={<Archive />}
            />
            <ConfirmAction
              title={`Xóa “${garden.name}”?`}
              description={
                canDelete
                  ? "Khu vườn chưa có dữ liệu liên quan và sẽ bị xóa vĩnh viễn."
                  : "Không thể xóa vì khu vườn vẫn có nhật ký hoặc dữ liệu chẩn đoán liên quan. Hãy lưu trữ thay thế."
              }
              actionLabel={isDeleting ? "Đang xóa..." : "Xóa vĩnh viễn"}
              onAction={remove}
              disabled={!canDelete || isDeleting || diseaseChecks.isLoading}
              variant="destructive"
              icon={<Trash2 />}
            />
          </div>
        </CardContent>
      </Card>
      <GardenFormDialog open={isEditOpen} onOpenChange={setIsEditOpen} garden={garden} />
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="truncate text-xl font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
function NotFoundGarden() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center p-10 text-center">
      <h1 className="text-xl font-semibold">Không tìm thấy khu vườn</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Khu vườn có thể đã được lưu trữ hoặc không còn tồn tại.
      </p>
      <Button asChild className="mt-5">
        <Link to="/gardens">Quay lại khu vườn</Link>
      </Button>
    </div>
  );
}
function ConfirmAction({
  title,
  description,
  actionLabel,
  onAction,
  disabled,
  variant,
  icon,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  disabled?: boolean;
  variant: "outline" | "destructive";
  icon: React.ReactNode;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={variant} disabled={disabled}>
          {icon} {variant === "outline" ? "Lưu trữ" : "Xóa"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Huỷ</AlertDialogCancel>
          <AlertDialogAction
            onClick={onAction}
            className={
              variant === "destructive"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : undefined
            }
          >
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
