import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/gardens/$gardenId/journal")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/logs/new", search: { gardenId: params.gardenId } });
  },
});
