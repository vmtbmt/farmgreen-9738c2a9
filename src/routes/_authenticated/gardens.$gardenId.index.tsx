import { createFileRoute } from "@tanstack/react-router";

import { GardenDetailPage } from "./gardens.$gardenId";

export const Route = createFileRoute("/_authenticated/gardens/$gardenId/")({
  component: GardenDetailPage,
});
