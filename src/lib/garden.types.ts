/** Shared Garden domain contracts. Future modules reference a garden by gardenId. */
export interface Garden {
  id: string;
  name: string;
  crop: string;
  area: number;
  location: string;
  plantedAt: string;
  notes: string;
  createdAt: string;
  archivedAt: string | null;
}
export type GardenInput = Omit<Garden, "id" | "createdAt" | "archivedAt">;
export type GardenModuleName = "tasks" | "journal" | "expenses" | "photos" | "harvest";
export interface GardenRelatedRecord {
  id: string;
  gardenId: string;
  createdAt: string;
}
export interface GardenRelationships {
  tasks: GardenRelatedRecord[];
  journal: GardenRelatedRecord[];
  expenses: GardenRelatedRecord[];
  photos: GardenRelatedRecord[];
  harvest: GardenRelatedRecord[];
}
