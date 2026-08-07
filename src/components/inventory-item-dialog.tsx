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
import {
  INVENTORY_CATEGORIES,
  INVENTORY_UNITS,
  useInventoryActions,
  type InventoryItem,
  type InventoryItemInput,
} from "@/lib/inventory-store";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: InventoryItem;
};

const emptyForm = (): InventoryItemInput => ({
  name: "",
  category: "Phân bón",
  unit: "kg",
  currentStock: 0,
  minStock: 0,
  note: "",
});

const toForm = (item?: InventoryItem): InventoryItemInput =>
  item
    ? {
        name: item.name,
        category: item.category,
        unit: item.unit,
        currentStock: item.currentStock,
        minStock: item.minStock,
        note: item.note,
      }
    : emptyForm();

export function InventoryItemDialog({ open, onOpenChange, item }: Props) {
  const actions = useInventoryActions();
  const [form, setForm] = useState<InventoryItemInput>(() => toForm(item));
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = Boolean(item);

  useEffect(() => {
    if (open) setForm(toForm(item));
  }, [item, open]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error("Vui lòng nhập tên vật tư.");
      return;
    }
    setIsSaving(true);
    try {
      if (item) {
        await actions.updateItem(item.id, form);
        toast.success("Đã cập nhật vật tư");
      } else {
        await actions.addItem(form);
        toast.success("Đã thêm vật tư mới");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Sửa vật tư" : "Thêm vật tư mới"}</DialogTitle>
          <DialogDescription>
            Nhập thông tin phân bón hoặc thuốc bảo vệ thực vật trong kho.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tên vật tư</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="VD: NPK 16-16-8"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Loại</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVENTORY_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Đơn vị</Label>
              <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVENTORY_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="current">Tồn kho hiện tại</Label>
              <Input
                id="current"
                type="number"
                min={0}
                step="any"
                value={form.currentStock}
                onChange={(e) => setForm({ ...form, currentStock: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min">Tồn kho tối thiểu</Label>
              <Input
                id="min"
                type="number"
                min={0}
                step="any"
                value={form.minStock}
                onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Ghi chú</Label>
            <Textarea
              id="note"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Nhà cung cấp, hạn sử dụng..."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="gradient-primary text-primary-foreground"
            >
              {isSaving ? "Đang lưu..." : isEditing ? "Lưu thay đổi" : "Thêm vật tư"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
