import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { InventoryItemDialog } from "@/components/inventory-item-dialog";
import { InventoryMovementDialog } from "@/components/inventory-movement-dialog";
import {
  INVENTORY_CATEGORIES,
  useInventory,
  useInventoryActions,
  type InventoryItem,
} from "@/lib/inventory-store";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({
    meta: [
      { title: "Tồn kho vật tư — Nông Trại Xanh" },
      {
        name: "description",
        content:
          "Quản lý tồn kho phân bón và thuốc bảo vệ thực vật: nhập kho, xuất kho và cảnh báo sắp hết.",
      },
      { property: "og:title", content: "Tồn kho vật tư — Nông Trại Xanh" },
      {
        property: "og:description",
        content: "Theo dõi phân bón, thuốc BVTV và cảnh báo tồn kho thấp cho nông trại của bạn.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InventoryPage,
});

function StatCard({
  label,
  value,
  icon: Icon,
  alert,
}: {
  label: string;
  value: string | number;
  icon: typeof Package;
  alert?: boolean;
}) {
  return (
    <Card className={alert ? "border-destructive/40 bg-destructive/5" : undefined}>
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
            alert ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function InventoryPage() {
  const { items, isLoading, error } = useInventory();
  const actions = useInventoryActions();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | undefined>(undefined);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveType, setMoveType] = useState<"in" | "out">("in");
  const [moveItem, setMoveItem] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState<InventoryItem | null>(null);
  const [filter, setFilter] = useState<string>("Tất cả");

  const lowStock = useMemo(
    () => items.filter((i) => i.currentStock <= i.minStock),
    [items],
  );
  const visible = useMemo(
    () => (filter === "Tất cả" ? items : items.filter((i) => i.category === filter)),
    [items, filter],
  );

  const openCreate = () => {
    setEditing(undefined);
    setFormOpen(true);
  };
  const openEdit = (item: InventoryItem) => {
    setEditing(item);
    setFormOpen(true);
  };
  const openMove = (item: InventoryItem, type: "in" | "out") => {
    setMoveItem(item);
    setMoveType(type);
    setMoveOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await actions.deleteItem(deleting.id);
      toast.success("Đã xóa vật tư");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không xóa được vật tư");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 overflow-x-hidden p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">📦 Tồn kho</h1>
          <p className="text-sm text-muted-foreground">
            Quản lý phân bón và thuốc bảo vệ thực vật của nông trại.
          </p>
        </div>
        <Button
          size="lg"
          onClick={openCreate}
          className="gradient-primary text-primary-foreground"
        >
          <Plus className="mr-2 h-4 w-4" />
          Thêm vật tư
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Tổng số vật tư" value={items.length} icon={Package} />
        <StatCard
          label="Sắp hết hàng"
          value={lowStock.length}
          icon={AlertTriangle}
          alert={lowStock.length > 0}
        />
        <StatCard
          label="Phân bón"
          value={items.filter((i) => i.category === "Phân bón").length}
          icon={Package}
        />
        <StatCard
          label="Thuốc BVTV"
          value={items.filter((i) => i.category === "Thuốc BVTV").length}
          icon={Package}
        />
      </div>

      {lowStock.length > 0 && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <p className="font-medium text-destructive">
            ⚠️ Có {lowStock.length} vật tư dưới mức tồn kho tối thiểu
          </p>
          <p className="mt-1 text-muted-foreground">
            {lowStock.map((i) => i.name).join(", ")}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {["Tất cả", ...INVENTORY_CATEGORIES].map((c) => (
          <Button
            key={c}
            size="sm"
            variant={filter === c ? "default" : "outline"}
            onClick={() => setFilter(c)}
          >
            {c}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Đang tải kho vật tư...
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-sm">
          <p className="font-medium text-destructive">Không tải được dữ liệu kho.</p>
          <p className="mt-1 text-muted-foreground">{error.message}</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-3 text-lg font-semibold">Kho đang trống</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Thêm phân bón hoặc thuốc BVTV để bắt đầu theo dõi tồn kho.
          </p>
          <Button onClick={openCreate} className="mt-4 gradient-primary text-primary-foreground">
            <Plus className="mr-2 h-4 w-4" />
            Thêm vật tư
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((item) => {
            const low = item.currentStock <= item.minStock;
            return (
              <Card key={item.id} className={low ? "border-destructive/40" : undefined}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">{item.name}</CardTitle>
                    <Badge variant="secondary">{item.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Tồn kho hiện tại</p>
                      <p
                        className={`text-2xl font-bold ${low ? "text-destructive" : "text-primary"}`}
                      >
                        {item.currentStock}{" "}
                        <span className="text-sm font-normal text-muted-foreground">
                          {item.unit}
                        </span>
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Tối thiểu: {item.minStock} {item.unit}
                    </p>
                  </div>

                  {low && (
                    <p className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Sắp hết — cần nhập thêm
                    </p>
                  )}

                  {item.note && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{item.note}</p>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant="outline" onClick={() => openMove(item, "in")}>
                      <ArrowDownToLine className="mr-1.5 h-4 w-4" />
                      Nhập kho
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openMove(item, "out")}>
                      <ArrowUpFromLine className="mr-1.5 h-4 w-4" />
                      Xuất kho
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>
                      <Pencil className="mr-1.5 h-4 w-4" />
                      Sửa
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleting(item)}
                    >
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      Xóa
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <InventoryItemDialog open={formOpen} onOpenChange={setFormOpen} item={editing} />
      <InventoryMovementDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        item={moveItem}
        type={moveType}
      />
      <AlertDialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa vật tư?</AlertDialogTitle>
            <AlertDialogDescription>
              Vật tư “{deleting?.name}” và lịch sử nhập/xuất của nó sẽ bị xóa vĩnh viễn.
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
