import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { EXPENSE_CATEGORIES } from "@/lib/expense-utils";
import { type ActivityLog, useFarmActions, useFarmStore } from "@/lib/farm-store";

export function ExpenseDialog({
  expense,
  gardenId,
  onClose,
}: {
  /** `{}` = tạo mới, có id = chỉnh sửa */
  expense?: Partial<ActivityLog>;
  gardenId?: string;
  onClose: () => void;
}) {
  const { gardens } = useFarmStore();
  const actions = useFarmActions();
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    gardenId: expense?.gardenId ?? gardenId ?? "",
    category: expense?.expenseCategory ?? "Phân bón",
    date: expense?.date ?? new Date().toISOString().slice(0, 10),
    cost: expense?.cost ? String(expense.cost) : "",
    note: expense?.note ?? "",
  });

  if (!expense) return null;
  const linkedToTask = Boolean(expense.taskId);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.gardenId) return toast.error("Vui lòng chọn khu vườn.");
    const cost = Number(f.cost) || 0;
    if (cost <= 0) return toast.error("Vui lòng nhập số tiền lớn hơn 0.");
    setSaving(true);
    try {
      if (expense.id) {
        await actions.updateExpense(expense.id, {
          gardenId: f.gardenId,
          expenseCategory: f.category,
          date: f.date,
          cost,
          note: f.note,
        });
      } else {
        await actions.addExpense({
          gardenId: f.gardenId,
          expenseCategory: f.category,
          date: f.date,
          cost,
          note: f.note,
        });
      }
      toast.success("Đã lưu khoản chi.");
      onClose();
    } catch (error) {
      toast.error(`Không thể lưu: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{expense.id ? "Sửa khoản chi" : "Thêm khoản chi"}</DialogTitle>
        </DialogHeader>
        {linkedToTask && (
          <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            Khoản chi này được ghi từ một công việc. Sửa ở đây chỉ đổi số tiền và ghi chú, công việc
            vẫn giữ nguyên.
          </p>
        )}
        <form onSubmit={save} className="grid gap-4">
          <div className="grid gap-2">
            <Label>Khu vườn *</Label>
            <Select value={f.gardenId} onValueChange={(v) => setF({ ...f, gardenId: v })}>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Nhóm chi phí *</Label>
              <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expense-date">Ngày chi</Label>
              <Input
                id="expense-date"
                type="date"
                value={f.date}
                onChange={(e) => setF({ ...f, date: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="expense-cost">Số tiền (VNĐ) *</Label>
            <Input
              id="expense-cost"
              type="number"
              min="0"
              step="1000"
              inputMode="numeric"
              value={f.cost}
              onChange={(e) => setF({ ...f, cost: e.target.value })}
              placeholder="Ví dụ: 500000"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="expense-note">Ghi chú</Label>
            <Textarea
              id="expense-note"
              rows={3}
              value={f.note}
              onChange={(e) => setF({ ...f, note: e.target.value })}
              placeholder="Mua phân NPK cho khu A..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>
              Huỷ
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="gradient-primary text-primary-foreground"
            >
              Lưu khoản chi
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
