import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { useFarmStore } from "@/lib/farm-store";

export const Route = createFileRoute("/_authenticated/logs/new")({
  component: LogsNewRedirect,
});

function LogsNewRedirect() {
  const router = useRouter();
  const { gardens } = useFarmStore();
  const search = Route.useSearch();

  useEffect(() => {
    const gardenId = (search as any).gardenId;
    if (gardenId) {
      router.navigate({ to: "/gardens/$gardenId/tasks", params: { gardenId }, search: { create: "1" } });
      return;
    }
    if (gardens.length > 0) {
      router.navigate({ to: "/gardens/$gardenId/tasks", params: { gardenId: gardens[0].id }, search: { create: "1" } });
      return;
    }
    router.navigate({ to: "/gardens" });
  }, [gardens]);

  return null;
}
