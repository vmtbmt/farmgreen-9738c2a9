import { Link } from "@tanstack/react-router";
import { ArrowLeft, Plus } from "lucide-react";
import { GardenWorkspaceTabs } from "@/components/garden-workspace-tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useFarmStore } from "@/lib/farm-store";

export function GardenWorkspacePlaceholder({
  gardenId,
  tab,
  title,
}: {
  gardenId: string;
  tab: "journal" | "expenses" | "photos";
  title: string;
}) {
  const { gardens, logs } = useFarmStore();
  const garden = gardens.find((g) => g.id === gardenId);
  const entries = logs.filter((l) => l.gardenId === gardenId);
  const cost = entries.reduce((n, l) => n + l.cost, 0);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <Button asChild size="sm" variant="ghost">
        <Link to="/gardens">
          <ArrowLeft /> Khu vườn
        </Link>
      </Button>
      <GardenWorkspaceTabs gardenId={gardenId} activeTab={tab} />
      <h1 className="text-2xl font-bold">
        {title}
        <span className="ml-2 text-sm font-normal text-muted-foreground">
          {garden?.name}
        </span>
      </h1>
      <Card>
        <CardContent className="p-5">
          {tab === "journal" ? (
            entries.length ? (
              entries.map((e) => (
                <div key={e.id} className="border-b py-3">
                  <b>{e.type}</b>
                  <p className="text-sm text-muted-foreground">{e.note}</p>
                </div>
              ))
            ) : (
              <Empty gardenId={gardenId} label="Chưa có nhật ký" />
            )
          ) : tab === "expenses" ? (
            <>
              <p className="text-sm text-muted-foreground">Tổng chi phí ghi nhận</p>
              <p className="text-3xl font-bold">
                {cost.toLocaleString("vi-VN")}₫
              </p>
            </>
          ) : (
            <Empty gardenId={gardenId} label="Chưa có ảnh nào" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Empty({ gardenId, label }: { gardenId: string; label: string }) {
  return (
    <div className="py-10 text-center">
      <p className="text-muted-foreground">{label}</p>
      <Button asChild className="mt-4" size="sm">
        <Link to="/logs/new" search={{ gardenId }}>
          <Plus /> Ghi nhật ký
        </Link>
      </Button>
    </div>
  );
}
