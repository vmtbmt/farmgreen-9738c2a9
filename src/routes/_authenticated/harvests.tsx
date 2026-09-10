import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Search, Sprout, Trash2, Wheat } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HarvestDialog } from "@/components/harvest-dialog";
import { useGardens } from "@/hooks/use-gardens";
import { formatVnd } from "@/lib/expense-utils";
import { useFinanceActions, useHarvests, type Harvest } from "@/lib/finance-store";

export const Route = createFileRoute("/_authenticated/harvests")({
  head: () => ({
    meta: [
      { title: "Thu hoạch & doanh thu — Nông Trại Xanh" },
      {
        name: "description",
        content:
          "Ghi nhận đợt thu hoạch, sản lượng, giá bán và tự động tính doanh thu cho từng khu vườn.",
      },
      { property: "og:title", content: "Thu hoạch & doanh thu — Nông Trại Xanh" },
      {
        property: "og:description",
        content: "Quản lý sản lượng thu hoạch và doanh thu bán nông sản theo vườn, cây trồng.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HarvestsPage,
});

const ALL = "all";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function HarvestsPage() {
  const { data: harvests = [], isLoading, error } = useHarvests();
  const { data: gardens = [] } = useGardens();
  const actions = useFinanceActions();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Harvest | undefined>(undefined);
  const [deleting, setDeleting] = useState<Harvest | null>(null);
  const [search, setSearch] = useState("");
  const [gardenId, setGardenId] = useState(ALL);
  const [crop, setCrop] = useState(ALL);
  const [month, setMonth] = useState(ALL);
  const [year, setYear] = useState(ALL);

  const gardenName = (id: string) => gardens.find((g) => g.id === id)?.name ?? "Khu vườn";

  const crops = useMemo(
    () => Array.from(new Set(harvests.map((h) => h.cropName).filter(Boolean))).sort(),
    [harvests],
  );
  const years = useMemo(
    () =>
      Array.from(new Set(harvests.map((h) => h.harvestDate.slice(0, 4)))).sort((a, b) =>
        b.localeCompare(a),
      ),
    [harvests],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return harvests.filter((h) => {
      if (gardenId !== ALL && h.gardenId !== gardenId) return false;
      if (crop !== ALL && h.cropName !== crop) return false;
      if (month !== ALL && h.harvestDate.slice(5, 7) !== month) return false;
      if (year !== ALL && h.harvestDate.slice(0, 4) !== year) return false;
      if (!q) return true;
      return [h.cropName, h.buyerName, h.note, gardenName(h.gardenId)]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [harvests, gardens, search, gardenId, crop, month, year]);

  const totals = useMemo(
    () => ({
      count: visible.length,
      quantity: visible.reduce((s, h) => s + h.quantity, 0),
      revenue: visible.reduce((s, h) => s + h.netRevenue, 0),
    }),
    [visible],
  );

  const openCreate = () => {
    setEditing(undefined);
    setDialogOpen(true);
  };
  const openEdit = (h: Harvest) => {
    setEditing(h);
    setDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await actions.deleteHarvest(deleting.id);
      toast.success("Đã xóa đợt thu hoạch");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không xóa được đợt thu hoạch");
    } finally {
      setDeleting(null);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setGardenId(ALL);
    setCrop(ALL);
    setMonth(ALL);
    setYear(ALL);
  };

  const hasFilter =
    Boolean(search) || gardenId !== ALL || crop !== ALL || month !== ALL || year !== ALL;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 overflow-x-hidden p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">🌾 Thu hoạch</h1>
          <p className="text-sm text-muted-foreground">
            Ghi nhận sản lượng, giá bán và doanh thu của từng đợt thu hoạch.
          </p>
        </div>
        <Button size="lg" onClick={openCreate} className="gradient-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" />
          Thêm thu hoạch
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Số đợt thu hoạch" value={String(totals.count)} />
        <StatCard
          label="Tổng sản lượng"
          value={`${totals.quantity.toLocaleString("vi-VN")}`}
        />
        <StatCard label="Doanh thu" value={formatVnd(totals.revenue)} />
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Tìm theo cây trồng, người mua, ghi chú..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Select value={gardenId} onValueChange={setGardenId}>
              <SelectTrigger>
                <SelectValue placeholder="Khu vườn" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tất cả khu vườn</SelectItem>
                {gardens.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={crop} onValueChange={setCrop}>
              <SelectTrigger>
                <SelectValue placeholder="Cây trồng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tất cả cây trồng</SelectItem>
                {crops.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger>
                <SelectValue placeholder="Tháng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tất cả tháng</SelectItem>
                {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((m) => (
                  <SelectItem key={m} value={m}>
                    Tháng {Number(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger>
                <SelectValue placeholder="Năm" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tất cả năm</SelectItem>
                {years.map((y) => (
                  <SelectItem key={y} value={y}>
                    Năm {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {hasFilter && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Xóa bộ lọc
            </Button>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Đang tải dữ liệu thu hoạch...
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-sm">
          <p className="font-medium text-destructive">Không tải được dữ liệu thu hoạch.</p>
          <p className="mt-1 text-muted-foreground">{(error as Error).message}</p>
        </div>
      ) : harvests.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Wheat className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-3 text-lg font-semibold">Chưa có dữ liệu thu hoạch</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Thêm đợt thu hoạch đầu tiên để theo dõi sản lượng và doanh thu.
          </p>
          <Button onClick={openCreate} className="mt-4 gradient-primary text-primary-foreground">
            <Plus className="mr-2 h-4 w-4" />
            Thêm thu hoạch
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Search className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-3 text-lg font-semibold">Không tìm thấy đợt thu hoạch nào</h2>
          <p className="mt-1 text-sm text-muted-foreground">Thử đổi từ khóa hoặc bộ lọc khác.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((h) => (
            <Card key={h.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{h.cropName || "Nông sản"}</p>
                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <Sprout className="h-3.5 w-3.5" />
                      {gardenName(h.gardenId)}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {new Date(h.harvestDate).toLocaleDateString("vi-VN")}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Sản lượng</p>
                    <p className="font-medium">
                      {h.quantity.toLocaleString("vi-VN")} {h.unit}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Giá bán</p>
                    <p className="font-medium">{formatVnd(h.pricePerUnit)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Doanh thu gộp</p>
                    <p className="font-medium">{formatVnd(h.grossRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Thực nhận</p>
                    <p className="font-semibold text-primary">{formatVnd(h.netRevenue)}</p>
                  </div>
                </div>

                {h.buyerName && (
                  <p className="text-xs text-muted-foreground">Người mua: {h.buyerName}</p>
                )}
                {h.note && <p className="line-clamp-2 text-xs text-muted-foreground">{h.note}</p>}

                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(h)}>
                    <Pencil className="mr-1.5 h-4 w-4" />
                    Sửa
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleting(h)}
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Xóa
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HarvestDialog open={dialogOpen} onOpenChange={setDialogOpen} harvest={editing} />

      <AlertDialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa đợt thu hoạch?</AlertDialogTitle>
            <AlertDialogDescription>
              Đợt thu hoạch ngày{" "}
              {deleting ? new Date(deleting.harvestDate).toLocaleDateString("vi-VN") : ""} và doanh
              thu kèm theo sẽ bị xóa vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
