import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Harvest = {
  id: string;
  gardenId: string;
  cropName: string;
  harvestDate: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  buyerName: string;
  note: string;
  createdAt: string;
  /** Chi phí bán hàng (nếu có) */
  shippingCost: number;
  commissionCost: number;
  otherCost: number;
  grossRevenue: number;
  netRevenue: number;
};

export type HarvestInput = {
  gardenId: string;
  cropName: string;
  harvestDate: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  buyerName: string;
  note: string;
  shippingCost: number;
  commissionCost: number;
  otherCost: number;
};

export const HARVEST_UNITS = ["kg", "tạ", "tấn", "bao", "thùng"] as const;

export const grossOf = (quantity: number, price: number) =>
  Math.max(0, Number(quantity) || 0) * Math.max(0, Number(price) || 0);

export const netOf = (input: {
  quantity: number;
  pricePerUnit: number;
  shippingCost: number;
  commissionCost: number;
  otherCost: number;
}) =>
  grossOf(input.quantity, input.pricePerUnit) -
  (Number(input.shippingCost) || 0) -
  (Number(input.commissionCost) || 0) -
  (Number(input.otherCost) || 0);

type HarvestRow = {
  id: string;
  garden_id: string;
  crop_name: string;
  harvest_date: string;
  quantity: number | string;
  unit: string;
  price_per_unit: number | string;
  buyer_name: string;
  note: string;
  created_at: string;
  revenues?: Array<{
    shipping_cost: number | string;
    commission_cost: number | string;
    other_cost: number | string;
    gross_revenue: number | string;
    net_revenue: number | string;
  }> | null;
};

function mapHarvest(r: HarvestRow): Harvest {
  const rev = r.revenues?.[0];
  const quantity = Number(r.quantity || 0);
  const pricePerUnit = Number(r.price_per_unit || 0);
  const gross = rev ? Number(rev.gross_revenue || 0) : grossOf(quantity, pricePerUnit);
  return {
    id: r.id,
    gardenId: r.garden_id,
    cropName: r.crop_name ?? "",
    harvestDate: r.harvest_date,
    quantity,
    unit: r.unit ?? "kg",
    pricePerUnit,
    buyerName: r.buyer_name ?? "",
    note: r.note ?? "",
    createdAt: r.created_at,
    shippingCost: Number(rev?.shipping_cost || 0),
    commissionCost: Number(rev?.commission_cost || 0),
    otherCost: Number(rev?.other_cost || 0),
    grossRevenue: gross,
    netRevenue: rev ? Number(rev.net_revenue || 0) : gross,
  };
}

async function fetchHarvests(): Promise<Harvest[]> {
  const { data, error } = await supabase
    .from("harvests")
    .select("*, revenues(*)")
    .order("harvest_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as HarvestRow[]).map(mapHarvest);
}

export function useHarvests() {
  return useQuery({ queryKey: ["harvests"], queryFn: fetchHarvests });
}

type SummaryRow = {
  garden_id: string | null;
  crop_name: string | null;
  month: string | null;
  year: number | null;
  revenue: number | string;
  expense: number | string;
  profit: number | string;
  quantity: number | string;
};

export type ProfitSummary = {
  gardenId: string | null;
  cropName: string;
  month: string;
  year: number;
  revenue: number;
  expense: number;
  profit: number;
  quantity: number;
};

export function useProfitSummary() {
  return useQuery({
    queryKey: ["profit_summary"],
    queryFn: async (): Promise<ProfitSummary[]> => {
      const { data, error } = await supabase.from("profit_summary_view").select("*");
      if (error) throw error;
      return (data as unknown as SummaryRow[]).map((r) => ({
        gardenId: r.garden_id,
        cropName: r.crop_name ?? "",
        month: r.month ?? "",
        year: Number(r.year || 0),
        revenue: Number(r.revenue || 0),
        expense: Number(r.expense || 0),
        profit: Number(r.profit || 0),
        quantity: Number(r.quantity || 0),
      }));
    },
  });
}

export function useFinanceActions() {
  const qc = useQueryClient();

  const invalidate = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["harvests"] }),
      qc.invalidateQueries({ queryKey: ["profit_summary"] }),
    ]);

  async function upsertRevenue(harvestId: string, userId: string, input: HarvestInput) {
    const payload = {
      user_id: userId,
      harvest_id: harvestId,
      gross_revenue: grossOf(input.quantity, input.pricePerUnit),
      shipping_cost: Number(input.shippingCost) || 0,
      commission_cost: Number(input.commissionCost) || 0,
      other_cost: Number(input.otherCost) || 0,
      net_revenue: netOf(input),
    };
    const { error } = await supabase.from("revenues").upsert(payload, { onConflict: "harvest_id" });
    if (error) throw error;
  }

  return {
    async addHarvest(input: HarvestInput) {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) throw new Error("Chưa đăng nhập");
      const { data: row, error } = await supabase
        .from("harvests")
        .insert({
          user_id: userId,
          garden_id: input.gardenId,
          crop_name: input.cropName,
          harvest_date: input.harvestDate,
          quantity: input.quantity,
          unit: input.unit,
          price_per_unit: input.pricePerUnit,
          buyer_name: input.buyerName,
          note: input.note,
        })
        .select("id")
        .single();
      if (error) throw error;
      await upsertRevenue(row.id, userId, input);
      await invalidate();
    },
    async updateHarvest(id: string, input: HarvestInput) {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) throw new Error("Chưa đăng nhập");
      const { error } = await supabase
        .from("harvests")
        .update({
          garden_id: input.gardenId,
          crop_name: input.cropName,
          harvest_date: input.harvestDate,
          quantity: input.quantity,
          unit: input.unit,
          price_per_unit: input.pricePerUnit,
          buyer_name: input.buyerName,
          note: input.note,
        })
        .eq("id", id);
      if (error) throw error;
      await upsertRevenue(id, userId, input);
      await invalidate();
    },
    async deleteHarvest(id: string) {
      const { error: revError } = await supabase.from("revenues").delete().eq("harvest_id", id);
      if (revError) throw revError;
      const { error } = await supabase.from("harvests").delete().eq("id", id);
      if (error) throw error;
      await invalidate();
    },
  };
}
