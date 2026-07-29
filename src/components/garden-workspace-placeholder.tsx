import { Link } from "@tanstack/react-router";
import { ArrowLeft, Construction } from "lucide-react";

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
  tab: "tasks" | "journal" | "expenses" | "photos" | "settings";
  title: string;
}) {
  const { gardens, isLoading } = useFarmStore();
  const garden = gardens.find((item) => item.id === gardenId);
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <Button asChild size="sm" variant="ghost">
        <Link to="/gardens">
          <ArrowLeft className="h-4 w-4" /> Khu vườn
        </Link>
      </Button>
      <GardenWorkspaceTabs gardenId={gardenId} activeTab={tab} />
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-1 text-muted-foreground">
          {isLoading ? "Đang tải khu vườn..." : garden ? garden.name : "Khu vườn"}
        </p>
      </div>
      <Card className="border-dashed">
        <CardContent className="flex min-h-56 flex-col items-center justify-center p-6 text-center">
          <Construction className="h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">Tính năng đang được chuẩn bị</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Nội dung cho mục {title.toLowerCase()} sẽ sớm được bổ sung.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
