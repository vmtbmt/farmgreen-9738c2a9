import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useGardens } from "@/hooks/use-gardens";
import { formatVnd } from "@/lib/expense-utils";
import { COMMON_CROPS, OTHER_CROP_VALUE, isCommonCrop } from "@/lib/crop-options";
import {
  HARVEST_UNITS,
  grossOf,
  netOf,
  useFinanceActions,
  type Harvest,
  type HarvestInput,
} from "@/lib/finance-store";

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = (gardenId = ""): HarvestInput => ({
  gardenId,
  cropName: "",
  harvestDate: today(),
  quantity: 0,
  unit: "kg",
  pricePerUnit: 0,
  buyerName: "",
  note: "",
  shippingCost: 0,
  commissionCost: 0,
  otherCost: 0,
});

export function HarvestDialog({
  open,
  onOpenChange,
  harvest,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  harvest?: Harvest;
}) {
  const { data: gardens = [] } = useGardens();
  const actions = useFinanceActions();
  const [form, setForm] = useState<HarvestInput>(emptyForm());
  const [customCrop, setCustomCrop] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (harvest) {
      setCustomCrop(Boolean(harvest.cropName && !isCommonCrop(harvest.cropName)));
      setForm({
        gardenId: harvest.gardenId,
        cropName: harvest.cropName,
        harvestDate: harvest.harvestDate,
        quantity: harvest.quantity,
        unit: harvest.unit,
        pricePerUnit: harvest.pricePerUnit,
        buyerName: harvest.buyerName,
        note: harvest.note,
        shippingCost: harvest.shippingCost,
        commissionCost: harvest.commissionCost,
        otherCost: harvest.otherCost,
      });
    } else {
      setForm(emptyForm(gardens[0]?.id ?? ""));
      setCustomCrop(false);
    }
  }, [open, harvest, gardens]);

  const set = <K extends keyof HarvestInput>(key: K, value: HarvestInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const gross = grossOf(form.quantity, form.pricePerUnit);
  const net = netOf(form);

  const submit = async () => {
    if (!form.gardenId) {
      toast.error("Vui lòng chọn khu vườn");
      return;
    }
    if (!form.quantity || form.quantity <= 0) {
      toast.error("Vui lòng nhập sản lượng");
      return;
    }
    setSaving(true);
    try {
      const payload: HarvestInput = {
        ...form,
        cropName:
          form.cropName.trim() || gardens.find((g) => g.id === form.gardenId)?.crop || "",
      };
      if (harvest) {
        await actions.updateHarvest(harvest.id, payload);
        toast.success("Đã cập nhật đợt thu hoạch");
      } else {
        await actions.addHarvest(payload);
        toast.success("Đã lưu đợt thu hoạch");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không lưu được đợt thu hoạch");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{harvest ? "Sửa đợt thu hoạch" : "Thêm đợt thu hoạch"}</DialogTitle>
          <DialogDescription>
            Nhập sản lượng và giá bán, doanh thu sẽ được tính tự động.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Vườn</Label>
              <Select value={form.gardenId} onValueChange={(v) => set("gardenId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn khu vườn" />
                </SelectTrigger>
                <SelectContent>
                  {gardens.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="crop">Cây trồng</Label>
              <Select
                value={customCrop ? OTHER_CROP_VALUE : form.cropName}
                onValueChange={(value) => {
                  const isOther = value === OTHER_CROP_VALUE;
                  setCustomCrop(isOther);
                  set("cropName", isOther ? "" : value);
                }}
              >
                <SelectTrigger id="crop"><SelectValue placeholder="Chọn cây trồng" /></SelectTrigger>
                <SelectContent>
                  {COMMON_CROPS.map((crop) => <SelectItem key={crop} value={crop}>{crop}</SelectItem>)}
                  <SelectItem value={OTHER_CROP_VALUE}>Cây khác</SelectItem>
                </SelectContent>
              </Select>
              {customCrop && (
                <Input
                  aria-label="Tên cây trồng khác"
                  value={form.cropName}
                  placeholder="Nhập tên cây trồng"
                  onChange={(e) => set("cropName", e.target.value)}
                  autoFocus
                />
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Ngày thu hoạch</Label>
              <Input
                id="date"
                type="date"
                value={form.harvestDate}
                onChange={(e) => set("harvestDate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="buyer">Người mua</Label>
              <Input
                id="buyer"
                value={form.buyerName}
                placeholder="Đại lý, thương lái..."
                onChange={(e) => set("buyerName", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="qty">Sản lượng</Label>
              <Input
                id="qty"
                type="number"
                min={0}
                inputMode="decimal"
                value={form.quantity || ""}
                onChange={(e) => set("quantity", Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Đơn vị</Label>
              <Select value={form.unit} onValueChange={(v) => set("unit", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HARVEST_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Giá bán / đơn vị</Label>
              <Input
                id="price"
                type="number"
                min={0}
                inputMode="numeric"
                value={form.pricePerUnit || ""}
                onChange={(e) => set("pricePerUnit", Number(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="ship">Chi phí vận chuyển</Label>
              <Input
                id="ship"
                type="number"
                min={0}
                value={form.shippingCost || ""}
                onChange={(e) => set("shippingCost", Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comm">Hoa hồng</Label>
              <Input
                id="comm"
                type="number"
                min={0}
                value={form.commissionCost || ""}
                onChange={(e) => set("commissionCost", Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="other">Chi phí khác</Label>
              <Input
                id="other"
                type="number"
                min={0}
                value={form.otherCost || ""}
                onChange={(e) => set("otherCost", Number(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Ghi chú</Label>
            <Textarea
              id="note"
              rows={2}
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
            />
          </div>

          <div className="rounded-lg border bg-primary/5 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Doanh thu gộp</span>
              <span className="font-semibold">{formatVnd(gross)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Doanh thu thực nhận</span>
              <span className="text-lg font-bold text-primary">{formatVnd(net)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Đang lưu..." : harvest ? "Lưu thay đổi" : "Thêm thu hoạch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
