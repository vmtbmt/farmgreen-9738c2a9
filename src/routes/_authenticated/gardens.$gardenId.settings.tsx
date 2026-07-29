import { createFileRoute } from "@tanstack/react-router";
import { GardenWorkspacePlaceholder } from "@/components/garden-workspace-placeholder";
export const Route = createFileRoute("/_authenticated/gardens/$gardenId/settings")({
  component: () => (
    <GardenWorkspacePlaceholder
      gardenId={Route.useParams().gardenId}
      tab="settings"
      title="Cài đặt"
    />
  ),
});
