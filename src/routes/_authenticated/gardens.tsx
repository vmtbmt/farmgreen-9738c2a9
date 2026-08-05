import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Sprout } from "lucide-react";

import { GardenCard } from "@/components/garden-card";
import { GardenFormDialog } from "@/components/garden-form-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllGardenTasks, useFarmStore } from "@/lib/farm-store";

export const Route = createFileRoute("/_authenticated/gardens")({
  head: () => ({
    meta: [
      { title: "Khu vườn — Nông Trại Xanh" },
      { name: "description", content: "Quản lý danh sách các khu vườn trong nông trại." },
    ],
  }),
  component: GardensPage,
});

function GardensPage() {
  const { gardens, logs, isLoading } = useFarmStore();
  const { data: tasks = [] } = useAllGardenTasks();
  const [isCreateOpen, setIsCreateOpen] = useState(false);


  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Khu vườn</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Chọn khu vực canh tác để bắt đầu.
          </p>
        </div>
        <Button
          className="gradient-primary text-primary-foreground"
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus /> Thêm khu mới
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : gardens.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary text-primary-foreground">
              <Sprout className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Chưa có khu vườn nào</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Thêm khu vườn đầu tiên để bắt đầu quản lý và ghi nhật ký hoạt động.
            </p>
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="mt-6 gradient-primary text-primary-foreground"
            >
              <Plus /> Thêm khu mới
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {gardens.map((garden) => (
            <GardenCard key={garden.id} garden={garden} logs={logs} tasks={tasks} />
          ))}
        </div>

      )}
      <GardenFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}
