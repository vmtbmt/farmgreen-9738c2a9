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
import { type Garden, type GardenInput, useFarmActions } from "@/lib/farm-store";

type GardenFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  garden?: Garden;
};

const emptyForm = (): GardenInput => ({
  name: "",
  crop: "",
  area: 0,
  location: "",
  plantedAt: new Date().toISOString().slice(0, 10),
  notes: "",
});

function toForm(garden?: Garden): GardenInput {
  return garden
    ? {
        name: garden.name,
        crop: garden.crop,
        area: garden.area,
        location: garden.location,
        plantedAt: garden.plantedAt,
        notes: garden.notes ?? "",
      }
    : emptyForm();
}

export function GardenFormDialog({ open, onOpenChange, garden }: GardenFormDialogProps) {
  const actions = useFarmActions();
  const [form, setForm] = useState<GardenInput>(() => toForm(garden));
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = Boolean(garden);

  useEffect(() => {
    if (open) setForm(toForm(garden));
  }, [garden, open]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.crop.trim()) {
      toast.error("Vui lòng nhập tên khu vườn và loại cây trồng.");
      return;
    }
    if (!form.plantedAt) {
      toast.error("Vui lòng chọn ngày trồng.");
      return;
    }

    setIsSaving(true);
    try {
      const input = {
        ...form,
        name: form.name.trim(),
        crop: form.crop.trim(),
        location: form.location.trim(),
        notes: form.notes?.trim() ?? "",
        area: Math.max(0, Number(form.area) || 0),
      };
      if (garden) await actions.updateGarden(garden.id, input);
      else await actions.addGarden(input);
      toast.success(isEditing ? "Đã cập nhật khu vườn." : "Đã thêm khu vườn mới!");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        `Không thể ${isEditing ? "cập nhật" : "thêm"} khu vườn: ${(error as Error).message}`,
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Chỉnh sửa khu vườn" : "Thêm khu vườn mới"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Cập nhật thông tin khu vực canh tác."
              : "Điền thông tin cơ bản về khu vực canh tác mới."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="garden-name">Tên khu vườn *</Label>
            <Input
              id="garden-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="VD: Vườn cà phê A"
              autoFocus
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="garden-crop">Loại cây trồng *</Label>
              <Input
                id="garden-crop"
                value={form.crop}
                onChange={(e) => setForm({ ...form, crop: e.target.value })}
                placeholder="VD: Cà phê"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="garden-area">Diện tích (m²)</Label>
              <Input
                id="garden-area"
                type="number"
                min={0}
                value={form.area || ""}
                onChange={(e) => setForm({ ...form, area: Number(e.target.value) })}
                placeholder="120"
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="garden-location">Vị trí</Label>
              <Input
                id="garden-location"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="VD: Khu A - sau nhà"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="garden-planted-at">Ngày trồng *</Label>
              <Input
                id="garden-planted-at"
                type="date"
                value={form.plantedAt}
                onChange={(e) => setForm({ ...form, plantedAt: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="garden-notes">Ghi chú</Label>
            <Textarea
              id="garden-notes"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Ghi chú về đất, khí hậu, chăm sóc..."
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Huỷ
            </Button>
            <Button
              type="submit"
              className="gradient-primary text-primary-foreground"
              disabled={isSaving}
            >
              {isSaving ? "Đang lưu..." : isEditing ? "Lưu thay đổi" : "Thêm khu vườn"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
