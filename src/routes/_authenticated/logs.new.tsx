import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { NotebookPen, ArrowLeft, Sprout } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ACTIVITY_TYPES, useFarmActions, useFarmStore, type ActivityType } from "@/lib/farm-store";

const searchSchema = z.object({
  gardenId: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/logs/new")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Ghi nhật ký — Nông Trại Xanh" },
      { name: "description", content: "Thêm nhật ký hoạt động cho khu vườn." },
      { property: "og:title", content: "Ghi nhật ký — Nông Trại Xanh" },
      { property: "og:description", content: "Ghi lại hoạt động chăm sóc nông trại." },
    ],
  }),
  component: NewLogPage,
});

function NewLogPage() {
  const { gardens } = useFarmStore();
  const actions = useFarmActions();
  const search = Route.useSearch();
  const router = useRouter();

  const [form, setForm] = useState({
    gardenId: search.gardenId ?? "",
    type: "Tưới nước" as ActivityType,
    date: new Date().toISOString().slice(0, 10),
    note: "",
    cost: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.gardenId) {
      toast.error("Vui lòng chọn khu vườn.");
      return;
    }
    try {
      await actions.addLog({
        gardenId: form.gardenId,
        type: form.type,
        date: form.date,
        note: form.note.trim(),
        cost: Number(form.cost) || 0,
      });
      toast.success("Đã lưu nhật ký hoạt động!");
      router.navigate({ to: "/logs" });
    } catch (err) {
      toast.error("Không thể lưu: " + (err as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2"
          onClick={() => router.history.back()}
        >
          <ArrowLeft /> Quay lại
        </Button>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Ghi nhật ký hoạt động</h1>
        <p className="mt-1 text-muted-foreground">
          Lưu lại công việc bạn đã thực hiện trên khu vườn.
        </p>
      </div>

      {gardens.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Sprout className="h-10 w-10 text-primary" />
            <p className="mt-3 font-medium">Chưa có khu vườn nào để ghi nhật ký</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Hãy thêm một khu vườn trước khi ghi nhật ký hoạt động.
            </p>
            <Button asChild className="mt-5 gradient-primary text-primary-foreground">
              <Link to="/gardens">Thêm khu vườn</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <NotebookPen className="h-5 w-5 text-primary" /> Thông tin hoạt động
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-4">
              <div className="grid gap-2">
                <Label>Khu vườn *</Label>
                <Select
                  value={form.gardenId}
                  onValueChange={(v) => setForm({ ...form, gardenId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn khu vườn" />
                  </SelectTrigger>
                  <SelectContent>
                    {gardens.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name} — {g.crop}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Loại hoạt động *</Label>
                  <Select
                    value={form.type}
                    onValueChange={(v) => setForm({ ...form, type: v as ActivityType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIVITY_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date">Ngày thực hiện</Label>
                  <Input
                    id="date"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="cost">Chi phí (VNĐ)</Label>
                <Input
                  id="cost"
                  type="number"
                  min="0"
                  step="1000"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                  placeholder="Ví dụ: 500000"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="note">Chi tiết</Label>
                <Textarea
                  id="note"
                  rows={4}
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Mô tả chi tiết: lượng nước, loại phân, quan sát sâu bệnh..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button asChild type="button" variant="outline">
                  <Link to="/logs">Huỷ</Link>
                </Button>
                <Button type="submit" className="gradient-primary text-primary-foreground">
                  Lưu nhật ký
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
