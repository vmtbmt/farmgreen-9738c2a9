import { createFileRoute } from "@tanstack/react-router";
import { GardenWorkspacePlaceholder } from "@/components/garden-workspace-placeholder";
export const Route = createFileRoute("/_authenticated/gardens/$gardenId/expenses")({
  component: () => (
    <GardenWorkspacePlaceholder
      gardenId={Route.useParams().gardenId}
      tab="expenses"
      title="Chi phí"
    />
  ),
});
