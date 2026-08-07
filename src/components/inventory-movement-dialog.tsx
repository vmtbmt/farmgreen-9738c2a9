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
import { Textarea } from "@/components/ui/textarea";
import { useInventoryActions, type InventoryItem } from "@/lib/inventory-store";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
  type: "in" | "out";
};

export function InventoryMovementDialog({ open, onOpenChange, item, type }: Props) {
  const actions = useInventoryActions();
  const [quantity, setQuantity] = useState<string>("");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setQuantity("");
      setNote("");
    }
  }, [open]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!item) return;
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      toast.error("Vui lòng nhập số lượng lớn hơn 0.");
      return;
    }
    setIsSaving(true);
    try {
      await actions.moveStock(item, type, qty, note);
      toast.success(type === "in" ? "Đã nhập kho" : "Đã xuất kho");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{type === "in" ? "Nhập kho" : "Xuất kho"}</DialogTitle>
          <DialogDescription>
            {item
              ? `${item.name} — đang còn ${item.currentStock} ${item.unit}`
              : "Chọn vật tư"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="qty">Số lượng ({item?.unit ?? ""})</Label>
            <Input
              id="qty"
              type="number"
              min={0}
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="VD: 10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mnote">Ghi chú</Label>
            <Textarea
              id="mnote"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={type === "in" ? "Mua từ đại lý..." : "Dùng cho khu vườn A..."}
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
              {isSaving ? "Đang lưu..." : type === "in" ? "Nhập kho" : "Xuất kho"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
