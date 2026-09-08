import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { ExpensesDashboard } from "@/components/expenses-dashboard";
import { GardenWorkspaceTabs } from "@/components/garden-workspace-tabs";
import { Button } from "@/components/ui/button";
import { useFarmStore } from "@/lib/farm-store";

export const Route = createFileRoute("/_authenticated/gardens/$gardenId/expenses")({
  head: () => ({
    meta: [
      { title: "Chi phí khu vườn | FarmGreen" },
      {
        name: "description",
        content: "Theo dõi chi phí khu vườn theo nhóm, theo tháng và theo từng công việc.",
      },
      { property: "og:title", content: "Chi phí khu vườn | FarmGreen" },
      {
        property: "og:description",
        content: "Theo dõi chi phí khu vườn theo nhóm, theo tháng và theo từng công việc.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExpensesPage,
});

function ExpensesPage() {
  const { gardenId } = Route.useParams();
  const { gardens } = useFarmStore();
  const garden = gardens.find((g) => g.id === gardenId);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 overflow-x-hidden p-4 sm:p-6">
      <Button asChild size="sm" variant="ghost">
        <Link to="/gardens">
          <ArrowLeft /> Khu vườn
        </Link>
      </Button>
      <GardenWorkspaceTabs gardenId={gardenId} activeTab="expenses" />
      <h1 className="text-2xl font-bold">
        Chi phí
        {garden && (
          <span className="ml-2 text-sm font-normal text-muted-foreground">{garden.name}</span>
        )}
      </h1>
      <ExpensesDashboard gardenId={gardenId} />
    </div>
  );
}
