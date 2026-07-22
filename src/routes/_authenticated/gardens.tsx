import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Sprout, Plus, MapPin, CalendarDays, Ruler, Trash2, NotebookPen } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { farmActions, useFarmStore } from "@/lib/farm-store";

export const Route = createFileRoute("/_authenticated/gardens")({
  head: () => ({
    meta: [
      { title: "Khu vườn — Nông Trại Xanh" },
      { name: "description", content: "Quản lý danh sách các khu vườn trong nông trại." },
      { property: "og:title", content: "Khu vườn — Nông Trại Xanh" },
      { property: "og:description", content: "Danh sách khu vườn và diện tích canh tác." },
    ],
  }),
  component: GardensPage,
});

function GardensPage() {
  const { gardens, logs } = useFarmStore();
  const [open, setOpen] = useState(false);

  const logCountByGarden = logs.reduce<Record<string, number>>((acc, l) => {
    acc[l.gardenId] = (acc[l.gardenId] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Khu vườn</h1>
          <p className="mt-1 text-muted-foreground">
            Quản lý các khu vực canh tác trên nông trại của bạn.
          </p>
        </div>
        <AddGardenDialog open={open} onOpenChange={setOpen} />
      </div>

      {gardens.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary text-primary-foreground">
              <Sprout className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Chưa có khu vườn nào</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Thêm khu vườn đầu tiên để bắt đầu quản lý và ghi nhật ký hoạt động.
            </p>
            <Button
              onClick={() => setOpen(true)}
              className="mt-6 gradient-primary text-primary-foreground"
            >
              <Plus /> Thêm khu mới
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {gardens.map((g) => (
            <Card key={g.id} className="group overflow-hidden transition-shadow hover:shadow-lg">
              <div className="h-2 gradient-primary" />
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{g.name}</CardTitle>
                    <Badge variant="secondary" className="mt-1">
                      {g.crop}
                    </Badge>
                  </div>
                  <DeleteGardenButton id={g.id} name={g.name} />
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" /> {g.location || "—"}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Ruler className="h-4 w-4" /> {g.area.toLocaleString("vi-VN")} m²
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="h-4 w-4" /> Trồng ngày{" "}
                  {new Date(g.plantedAt).toLocaleDateString("vi-VN")}
                </div>
                {g.notes && <p className="pt-2 text-foreground/80">{g.notes}</p>}
                <div className="flex items-center justify-between pt-3">
                  <Badge variant="outline">
                    <NotebookPen className="h-3.5 w-3.5" />
                    {logCountByGarden[g.id] ?? 0} nhật ký
                  </Badge>
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/logs/new" search={{ gardenId: g.id }}>
                      Ghi nhật ký
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AddGardenDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    crop: "",
    area: "",
    location: "",
    plantedAt: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.crop.trim()) {
      toast.error("Vui lòng nhập tên khu vườn và loại cây trồng.");
      return;
    }
    farmActions.addGarden({
      name: form.name.trim(),
      crop: form.crop.trim(),
      area: Number(form.area) || 0,
      location: form.location.trim(),
      plantedAt: form.plantedAt,
      notes: form.notes.trim(),
    });
    toast.success("Đã thêm khu vườn mới!");
    setForm({
      name: "",
      crop: "",
      area: "",
      location: "",
      plantedAt: new Date().toISOString().slice(0, 10),
      notes: "",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="gradient-primary text-primary-foreground">
          <Plus /> Thêm khu mới
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Thêm khu vườn mới</DialogTitle>
          <DialogDescription>
            Điền thông tin cơ bản về khu vực canh tác mới.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Tên khu vườn *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="VD: Vườn rau sau nhà"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="crop">Loại cây trồng *</Label>
              <Input
                id="crop"
                value={form.crop}
                onChange={(e) => setForm({ ...form, crop: e.target.value })}
                placeholder="VD: Rau cải xanh"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="area">Diện tích (m²)</Label>
              <Input
                id="area"
                type="number"
                min={0}
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                placeholder="120"
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="location">Vị trí</Label>
              <Input
                id="location"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="VD: Khu A - Sau nhà"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="plantedAt">Ngày trồng</Label>
              <Input
                id="plantedAt"
                type="date"
                value={form.plantedAt}
                onChange={(e) => setForm({ ...form, plantedAt: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Ghi chú</Label>
            <Textarea
              id="notes"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Ghi chú về đất, khí hậu, chăm sóc..."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Huỷ
            </Button>
            <Button type="submit" className="gradient-primary text-primary-foreground">
              Thêm khu vườn
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteGardenButton({ id, name }: { id: string; name: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xoá khu "{name}"?</AlertDialogTitle>
          <AlertDialogDescription>
            Hành động này sẽ xoá khu vườn và toàn bộ nhật ký liên quan. Không thể hoàn tác.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Huỷ</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              farmActions.deleteGarden(id);
              toast.success("Đã xoá khu vườn.");
            }}
          >
            Xoá
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
