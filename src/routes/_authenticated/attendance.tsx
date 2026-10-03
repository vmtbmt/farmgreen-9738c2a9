import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CalendarCheck, CheckCheck, ChevronLeft, ChevronRight, Loader2, Pencil, Plus, UserMinus, UserPlus, Users,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatVnd } from "@/lib/expense-utils";
import {
  STATUS_LABELS, WORKER_TYPES, calcWage, useAttendance, useAttendanceActions, useWorkers,
  type AttendanceRecord, type AttendanceStatus, type Worker, type WorkerInput,
} from "@/lib/attendance-store";

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({
    meta: [
      { title: "Chấm công nhân công — Nông Trại Xanh" },
      { name: "description", content: "Chấm công từng nhân công theo ngày, tính tiền công và tổng hợp tháng." },
      { property: "og:title", content: "Chấm công nhân công — Nông Trại Xanh" },
      { property: "og:description", content: "Chấm công từng nhân công theo ngày, tính tiền công và tổng hợp tháng." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AttendancePage,
});

const toKey = (d: Date) => {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
};
const shiftDay = (key: string, n: number) => {
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() + n);
  return toKey(d);
};
const fmtDate = (key: string) =>
  new Date(`${key}T12:00:00`).toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
const monthEnd = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  return toKey(new Date(y, mo, 0));
};

const STATUS_STYLE: Record<AttendanceStatus, string> = {
  present: "bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600",
  half: "bg-amber-500 text-white hover:bg-amber-600 border-amber-500",
  absent: "bg-destructive text-white hover:bg-destructive/90 border-destructive",
};

function AttendancePage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 overflow-x-hidden p-4 sm:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <CalendarCheck className="h-6 w-6 text-primary" /> Chấm công
        </h1>
        <p className="text-muted-foreground">Chọn ngày, rồi bấm trạng thái cho từng người.</p>
      </div>
      <Tabs defaultValue="daily">
        <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="daily" className="py-2">Chấm công</TabsTrigger>
          <TabsTrigger value="history" className="py-2">Lịch sử</TabsTrigger>
          <TabsTrigger value="monthly" className="py-2">Tổng hợp tháng</TabsTrigger>
          <TabsTrigger value="workers" className="py-2">Nhân công</TabsTrigger>
        </TabsList>
        <TabsContent value="daily" className="mt-4"><DailyTab /></TabsContent>
        <TabsContent value="history" className="mt-4"><HistoryTab /></TabsContent>
        <TabsContent value="monthly" className="mt-4"><MonthlyTab /></TabsContent>
        <TabsContent value="workers" className="mt-4"><WorkersTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" /> Đang tải...
    </div>
  );
}

function Empty({ title, desc, action }: { title: string; desc: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border-2 border-dashed p-8 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ---------------- Daily ---------------- */

function DailyTab() {
  const [date, setDate] = useState(() => toKey(new Date()));
  const workersQ = useWorkers();
  const attQ = useAttendance(date, date);
  const actions = useAttendanceActions();
  const [busy, setBusy] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const active = (workersQ.data ?? []).filter((w) => w.active);
  const records = attQ.data ?? [];
  const byWorker = new Map(records.map((r) => [r.workerId, r]));
  // Show active workers plus inactive ones who already have a record that day
  const list = [
    ...active,
    ...(workersQ.data ?? []).filter((w) => !w.active && byWorker.has(w.id)),
  ];

  const summary = useMemo(() => {
    const s = { present: 0, half: 0, absent: 0, cost: 0 };
    for (const r of records) {
      s[r.status] += 1;
      s.cost += r.wageAmount;
    }
    return s;
  }, [records]);

  const mark = async (w: Worker, status: AttendanceStatus, ot?: number, note?: string) => {
    const cur = byWorker.get(w.id);
    setBusy(w.id);
    try {
      await actions.mark([{ worker: w, date, status, overtimeHours: ot ?? cur?.overtimeHours ?? 0, note: note ?? cur?.note ?? "" }]);
    } catch (e) {
      toast.error("Không lưu được chấm công", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const markAll = async () => {
    const todo = active.filter((w) => !byWorker.has(w.id));
    if (!todo.length) return toast.info("Tất cả đã được chấm công");
    setBusy("all");
    try {
      await actions.mark(todo.map((w) => ({ worker: w, date, status: "present" as const, overtimeHours: 0, note: "" })));
      toast.success(`Đã chấm có mặt cho ${todo.length} người`);
    } catch (e) {
      toast.error("Không lưu được", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  if (workersQ.isLoading) return <Loading />;
  if (workersQ.error)
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4">
        Không tải được danh sách nhân công.{" "}
        <Button variant="outline" size="sm" onClick={() => workersQ.refetch()}>Thử lại</Button>
      </div>
    );

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-11 w-11" onClick={() => setDate(shiftDay(date, -1))} aria-label="Ngày trước">
              <ChevronLeft />
            </Button>
            <Input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="h-11 w-44" />
            <Button variant="outline" size="icon" className="h-11 w-11" onClick={() => setDate(shiftDay(date, 1))} aria-label="Ngày sau">
              <ChevronRight />
            </Button>
            <Button variant="ghost" className="h-11" onClick={() => setDate(toKey(new Date()))}>Hôm nay</Button>
          </div>
          <Button size="lg" className="gradient-primary text-primary-foreground" onClick={markAll} disabled={busy === "all" || !active.length}>
            {busy === "all" ? <Loader2 className="animate-spin" /> : <CheckCheck />} Tất cả có mặt
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <SummaryCard label="Tổng nhân công" value={String(active.length)} />
        <SummaryCard label="Có mặt" value={String(summary.present)} className="text-emerald-700" />
        <SummaryCard label="Nửa ngày" value={String(summary.half)} className="text-amber-600" />
        <SummaryCard label="Vắng" value={String(summary.absent)} className="text-destructive" />
        <SummaryCard label="Tổng tiền công" value={formatVnd(summary.cost)} className="col-span-2 md:col-span-1" />
      </div>
      <p className="text-sm text-muted-foreground">{fmtDate(date)} · Chưa chấm: {Math.max(active.length - records.filter((r) => active.some((w) => w.id === r.workerId)).length, 0)} người</p>

      {list.length === 0 ? (
        <Empty
          title="Chưa có nhân công"
          desc="Thêm nhân công để bắt đầu chấm công hằng ngày."
          action={<Button size="lg" onClick={() => setAddOpen(true)}><UserPlus /> Thêm nhân công</Button>}
        />
      ) : attQ.isLoading ? (
        <Loading />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {list.map((w) => (
            <WorkerAttendanceRow key={w.id} worker={w} record={byWorker.get(w.id)} busy={busy === w.id} onMark={mark} onClear={async (id) => {
              try { await actions.clear(id); } catch (e) { toast.error((e as Error).message); }
            }} />
          ))}
        </div>
      )}
      <WorkerDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

function SummaryCard({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <Card className={className.includes("col-span") ? className.split(" ").filter((c) => c.includes("col-span")).join(" ") : ""}>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`mt-1 text-xl font-bold ${className}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function WorkerAttendanceRow({
  worker, record, busy, onMark, onClear,
}: {
  worker: Worker;
  record?: AttendanceRecord;
  busy: boolean;
  onMark: (w: Worker, s: AttendanceStatus, ot?: number, note?: string) => Promise<void>;
  onClear: (id: string) => Promise<void>;
}) {
  const [showMore, setShowMore] = useState(false);
  const [ot, setOt] = useState(String(record?.overtimeHours || ""));
  const [note, setNote] = useState(record?.note ?? "");
  const status = record?.status;
  const wage = record ? record.wageAmount : 0;

  return (
    <Card className={status ? "" : "border-dashed"}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{worker.fullName}</p>
            <p className="text-sm text-muted-foreground">{worker.workerType} · {formatVnd(worker.dailyWage)}/ngày</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Tiền công</p>
            <p className="font-bold text-primary">{status ? formatVnd(wage) : "—"}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(["present", "half", "absent"] as AttendanceStatus[]).map((s) => (
            <Button
              key={s}
              variant="outline"
              disabled={busy}
              onClick={() => onMark(worker, s)}
              className={`h-12 text-base ${status === s ? STATUS_STYLE[s] : ""}`}
            >
              {STATUS_LABELS[s]}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {record?.overtimeHours ? <Badge variant="secondary">Tăng ca {record.overtimeHours} giờ</Badge> : null}
          {record?.note ? <span className="truncate text-muted-foreground">“{record.note}”</span> : null}
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setShowMore((v) => !v)} disabled={!status}>
            {showMore ? "Đóng" : "Tăng ca / ghi chú"}
          </Button>
        </div>
        {showMore && status && (
          <div className="space-y-2 rounded-lg bg-muted/50 p-3">
            <Label>Giờ tăng ca</Label>
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3, 4].map((h) => (
                <Button key={h} type="button" size="sm" variant={Number(ot || 0) === h ? "default" : "outline"} className="h-10 min-w-12" onClick={() => setOt(String(h))}>
                  {h === 0 ? "Không" : `${h}g`}
                </Button>
              ))}
              <Input inputMode="decimal" className="h-10 w-20" value={ot} onChange={(e) => setOt(e.target.value)} placeholder="Khác" />
            </div>
            <p className="text-xs text-muted-foreground">Tiền tăng ca = lương ngày ÷ 8 × số giờ. Dự tính: {formatVnd(calcWage(status, worker.dailyWage, Number(ot) || 0))}</p>
            <Label>Ghi chú</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: về sớm, làm vườn sầu riêng" className="h-11" />
            <div className="flex gap-2">
              <Button className="h-11 flex-1" disabled={busy} onClick={async () => { await onMark(worker, status, Number(ot) || 0, note); setShowMore(false); toast.success("Đã lưu"); }}>
                Lưu
              </Button>
              <Button variant="outline" className="h-11" disabled={busy} onClick={() => record && onClear(record.id)}>
                Bỏ chấm công
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- History ---------------- */

function HistoryTab() {
  const today = toKey(new Date());
  const [from, setFrom] = useState(shiftDay(today, -30));
  const [to, setTo] = useState(today);
  const [workerId, setWorkerId] = useState("all");
  const workersQ = useWorkers();
  const attQ = useAttendance(from, to);
  const names = new Map((workersQ.data ?? []).map((w) => [w.id, w.fullName]));
  const rows = (attQ.data ?? []).filter((r) => workerId === "all" || r.workerId === workerId);
  const total = rows.reduce((s, r) => s + r.wageAmount, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid gap-3 pt-6 sm:grid-cols-3">
          <div><Label>Từ ngày</Label><Input type="date" className="h-11" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>Đến ngày</Label><Input type="date" className="h-11" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div>
            <Label>Nhân công</Label>
            <Select value={workerId} onValueChange={setWorkerId}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {(workersQ.data ?? []).map((w) => <SelectItem key={w.id} value={w.id}>{w.fullName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">{rows.length} lượt chấm công · Tổng: <b className="text-foreground">{formatVnd(total)}</b></p>
      {attQ.isLoading ? <Loading /> : rows.length === 0 ? (
        <Empty title="Chưa có lịch sử" desc="Không có lượt chấm công nào trong khoảng thời gian này." />
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{names.get(r.workerId) ?? "Nhân công"}</p>
                  <p className="text-sm text-muted-foreground">
                    {fmtDate(r.workDate)}{r.overtimeHours ? ` · Tăng ca ${r.overtimeHours}g` : ""}{r.note ? ` · ${r.note}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge className={STATUS_STYLE[r.status]}>{STATUS_LABELS[r.status]}</Badge>
                  <span className="text-sm font-semibold">{formatVnd(r.wageAmount)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Monthly ---------------- */

function MonthlyTab() {
  const [month, setMonth] = useState(() => toKey(new Date()).slice(0, 7));
  const workersQ = useWorkers();
  const attQ = useAttendance(`${month}-01`, monthEnd(month));

  const rows = useMemo(() => {
    const map = new Map<string, { present: number; half: number; absent: number; wage: number; ot: number }>();
    for (const r of attQ.data ?? []) {
      const s = map.get(r.workerId) ?? { present: 0, half: 0, absent: 0, wage: 0, ot: 0 };
      s[r.status] += 1;
      s.wage += r.wageAmount;
      s.ot += r.overtimeHours;
      map.set(r.workerId, s);
    }
    return (workersQ.data ?? [])
      .filter((w) => w.active || map.has(w.id))
      .map((w) => ({ w, s: map.get(w.id) ?? { present: 0, half: 0, absent: 0, wage: 0, ot: 0 } }));
  }, [attQ.data, workersQ.data]);
  const total = rows.reduce((s, r) => s + r.s.wage, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-end justify-between gap-3 pt-6">
          <div><Label>Tháng</Label><Input type="month" className="h-11 w-48" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} /></div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Tổng tiền công tháng</p>
            <p className="text-2xl font-bold text-primary">{formatVnd(total)}</p>
          </div>
        </CardContent>
      </Card>
      {attQ.isLoading || workersQ.isLoading ? <Loading /> : rows.length === 0 ? (
        <Empty title="Chưa có dữ liệu" desc="Thêm nhân công và chấm công để xem tổng hợp tháng." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map(({ w, s }) => (
            <Card key={w.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="truncate">{w.fullName}</span>
                  <span className="text-primary">{formatVnd(s.wage)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-4 gap-2 text-center text-sm">
                <Stat label="Có mặt" value={s.present} className="text-emerald-700" />
                <Stat label="Nửa ngày" value={s.half} className="text-amber-600" />
                <Stat label="Vắng" value={s.absent} className="text-destructive" />
                <Stat label="Tăng ca (g)" value={s.ot} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, className = "" }: { label: string; value: number; className?: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-2">
      <p className={`text-lg font-bold ${className}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

/* ---------------- Workers ---------------- */

function WorkersTab() {
  const workersQ = useWorkers();
  const actions = useAttendanceActions();
  const [edit, setEdit] = useState<Worker | null>(null);
  const [open, setOpen] = useState(false);
  const list = workersQ.data ?? [];

  const toggle = async (w: Worker) => {
    try {
      await actions.setWorkerActive(w.id, !w.active);
      toast.success(w.active ? "Đã cho nghỉ làm" : "Đã cho làm lại");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <Button size="lg" className="gradient-primary text-primary-foreground" onClick={() => { setEdit(null); setOpen(true); }}>
        <Plus /> Thêm nhân công
      </Button>
      {workersQ.isLoading ? <Loading /> : list.length === 0 ? (
        <Empty title="Chưa có nhân công" desc="Thêm người làm để chấm công mỗi ngày." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((w) => (
            <Card key={w.id} className={w.active ? "" : "opacity-60"}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate font-semibold"><Users className="h-4 w-4 text-primary" />{w.fullName}</p>
                    <p className="text-sm text-muted-foreground">{w.workerType}{w.phone ? ` · ${w.phone}` : ""}</p>
                  </div>
                  {!w.active && <Badge variant="secondary">Đã nghỉ</Badge>}
                </div>
                <p className="text-lg font-bold text-primary">{formatVnd(w.dailyWage)}<span className="text-sm font-normal text-muted-foreground">/ngày</span></p>
                {w.notes && <p className="text-sm text-muted-foreground">{w.notes}</p>}
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="h-11" onClick={() => { setEdit(w); setOpen(true); }}><Pencil /> Sửa</Button>
                  <Button variant="outline" className="h-11" onClick={() => toggle(w)}>
                    {w.active ? <><UserMinus /> Cho nghỉ</> : <><UserPlus /> Làm lại</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <WorkerDialog open={open} onOpenChange={setOpen} worker={edit} />
    </div>
  );
}

const WAGE_PRESETS = [200000, 250000, 300000, 350000, 400000];

function WorkerDialog({ open, onOpenChange, worker }: { open: boolean; onOpenChange: (v: boolean) => void; worker?: Worker | null }) {
  const actions = useAttendanceActions();
  const blank: WorkerInput = { fullName: "", phone: "", workerType: WORKER_TYPES[0], dailyWage: 300000, notes: "" };
  const [form, setForm] = useState<WorkerInput>(blank);
  const [saving, setSaving] = useState(false);
  const [lastKey, setLastKey] = useState<string | null>(null);
  const key = `${open}-${worker?.id ?? "new"}`;
  if (key !== lastKey) {
    setLastKey(key);
    if (open) setForm(worker ? { fullName: worker.fullName, phone: worker.phone, workerType: worker.workerType, dailyWage: worker.dailyWage, notes: worker.notes } : blank);
  }

  const submit = async () => {
    if (!form.fullName.trim()) return toast.error("Vui lòng nhập họ tên");
    if (!(form.dailyWage >= 0)) return toast.error("Lương ngày không hợp lệ");
    setSaving(true);
    try {
      await actions.saveWorker(form, worker?.id);
      toast.success(worker ? "Đã cập nhật nhân công" : "Đã thêm nhân công");
      onOpenChange(false);
    } catch (e) {
      toast.error("Không lưu được", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{worker ? "Sửa nhân công" : "Thêm nhân công"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Họ tên *</Label><Input className="h-11" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
          <div><Label>Số điện thoại</Label><Input className="h-11" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div>
            <Label>Loại nhân công</Label>
            <Select value={form.workerType} onValueChange={(v) => setForm({ ...form, workerType: v })}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>{WORKER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Lương ngày (₫)</Label>
            <div className="mb-2 flex flex-wrap gap-2">
              {WAGE_PRESETS.map((p) => (
                <Button key={p} type="button" size="sm" variant={form.dailyWage === p ? "default" : "outline"} className="h-10" onClick={() => setForm({ ...form, dailyWage: p })}>
                  {p / 1000}k
                </Button>
              ))}
            </div>
            <Input className="h-11" inputMode="numeric" value={form.dailyWage ? String(form.dailyWage) : ""} onChange={(e) => setForm({ ...form, dailyWage: Number(e.target.value.replace(/\D/g, "")) || 0 })} />
          </div>
          <div><Label>Ghi chú</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button size="lg" className="gradient-primary w-full text-primary-foreground" onClick={submit} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />} Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
