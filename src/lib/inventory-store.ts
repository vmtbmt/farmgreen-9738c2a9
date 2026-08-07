import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type InventoryCategory = "Phân bón" | "Thuốc BVTV";
export const INVENTORY_CATEGORIES: InventoryCategory[] = ["Phân bón", "Thuốc BVTV"];
export const INVENTORY_UNITS = ["kg", "gram", "lít", "ml", "bao", "chai", "gói"];

export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minStock: number;
  note: string;
  createdAt: string;
};

export type InventoryItemInput = {
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minStock: number;
  note: string;
};

export type InventoryMovement = {
  id: string;
  itemId: string;
  type: "in" | "out";
  quantity: number;
  note: string;
  date: string;
  createdAt: string;
};

type ItemRow = {
  id: string;
  name: string;
  category: string;
  unit: string;
  current_stock: number | string;
  min_stock: number | string;
  note: string | null;
  created_at: string;
};

type MovementRow = {
  id: string;
  item_id: string;
  type: string;
  quantity: number | string;
  note: string | null;
  date: string;
  created_at: string;
};

const mapItem = (r: ItemRow): InventoryItem => ({
  id: r.id,
  name: r.name,
  category: r.category,
  unit: r.unit,
  currentStock: Number(r.current_stock || 0),
  minStock: Number(r.min_stock || 0),
  note: r.note ?? "",
  createdAt: r.created_at,
});

const mapMovement = (r: MovementRow): InventoryMovement => ({
  id: r.id,
  itemId: r.item_id,
  type: r.type === "out" ? "out" : "in",
  quantity: Number(r.quantity || 0),
  note: r.note ?? "",
  date: r.date,
  createdAt: r.created_at,
});

async function fetchItems(): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as ItemRow[]).map(mapItem);
}

async function fetchMovements(): Promise<InventoryMovement[]> {
  const { data, error } = await supabase
    .from("inventory_movements")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data as unknown as MovementRow[]).map(mapMovement);
}

export function useInventory() {
  const itemsQ = useQuery({ queryKey: ["inventory_items"], queryFn: fetchItems });
  const movementsQ = useQuery({ queryKey: ["inventory_movements"], queryFn: fetchMovements });
  return {
    items: itemsQ.data ?? [],
    movements: movementsQ.data ?? [],
    isLoading: itemsQ.isLoading,
    error: itemsQ.error as Error | null,
  };
}

export function useInventoryActions() {
  const qc = useQueryClient();
  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["inventory_items"] }),
      qc.invalidateQueries({ queryKey: ["inventory_movements"] }),
    ]);
  };
  return {
    async addItem(input: InventoryItemInput) {
      const { data: userRes } = await supabase.auth.getUser();
      const user_id = userRes.user?.id;
      if (!user_id) throw new Error("Chưa đăng nhập");
      const { error } = await supabase.from("inventory_items").insert({
        user_id,
        name: input.name,
        category: input.category,
        unit: input.unit,
        current_stock: input.currentStock,
        min_stock: input.minStock,
        note: input.note,
      });
      if (error) throw error;
      await refresh();
    },
    async updateItem(id: string, input: InventoryItemInput) {
      const { error } = await supabase
        .from("inventory_items")
        .update({
          name: input.name,
          category: input.category,
          unit: input.unit,
          current_stock: input.currentStock,
          min_stock: input.minStock,
          note: input.note,
        })
        .eq("id", id);
      if (error) throw error;
      await refresh();
    },
    async deleteItem(id: string) {
      const { error } = await supabase.from("inventory_items").delete().eq("id", id);
      if (error) throw error;
      await refresh();
    },
    async moveStock(item: InventoryItem, type: "in" | "out", quantity: number, note: string) {
      const { data: userRes } = await supabase.auth.getUser();
      const user_id = userRes.user?.id;
      if (!user_id) throw new Error("Chưa đăng nhập");
      if (quantity <= 0) throw new Error("Số lượng phải lớn hơn 0");
      const next =
        type === "in" ? item.currentStock + quantity : item.currentStock - quantity;
      if (next < 0) throw new Error("Không đủ tồn kho để xuất");
      const { error: mErr } = await supabase.from("inventory_movements").insert({
        user_id,
        item_id: item.id,
        type,
        quantity,
        note,
      });
      if (mErr) throw mErr;
      const { error } = await supabase
        .from("inventory_items")
        .update({ current_stock: next })
        .eq("id", item.id);
      if (error) throw error;
      await refresh();
    },
  };
}
