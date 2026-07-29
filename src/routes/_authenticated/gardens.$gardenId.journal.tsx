import { createFileRoute } from "@tanstack/react-router";
import { GardenWorkspacePlaceholder } from "@/components/garden-workspace-placeholder";
export const Route = createFileRoute("/_authenticated/gardens/$gardenId/journal")({
  component: () => (
    <GardenWorkspacePlaceholder
      gardenId={Route.useParams().gardenId}
      tab="journal"
      title="Nhật ký"
    />
  ),
});
