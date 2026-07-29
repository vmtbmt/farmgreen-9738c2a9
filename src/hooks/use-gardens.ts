import { useQuery } from "@tanstack/react-query";
import { gardenRepository } from "@/lib/garden.repository";
export const gardenQueryKey = ["gardens"] as const;
export function useGardens() {
  return useQuery({ queryKey: gardenQueryKey, queryFn: () => gardenRepository.listActive() });
}
export function useGarden(gardenId: string) {
  const query = useGardens();
  return { ...query, garden: query.data?.find((garden) => garden.id === gardenId) };
}
