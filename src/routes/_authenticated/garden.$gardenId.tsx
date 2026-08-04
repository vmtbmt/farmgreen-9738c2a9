import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/garden/$gardenId")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/gardens/$gardenId",
      params: { gardenId: params.gardenId },
    });
  },
});
