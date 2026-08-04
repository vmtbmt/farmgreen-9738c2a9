import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Stethoscope, Upload, Loader2, AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { diagnoseDisease } from "@/lib/ai.functions";
import { useDiseaseChecks, useFarmActions, useFarmStore } from "@/lib/farm-store";

export const Route = createFileRoute("/_authenticated/diagnose")({
  head: () => ({
    meta: [
      { title: "Chẩn đoán bệnh — Nông Trại Xanh" },
      { name: "description", content: "AI chẩn đoán bệnh cây trồng từ ảnh chụp." },
      { property: "og:title", content: "Chẩn đoán bệnh — Nông Trại Xanh" },
      { property: "og:description", content: "Tải ảnh cây, AI phân tích và đưa ra khuyến nghị." },
    ],
  }),
  component: DiagnosePage,
});

async function fileToResizedDataUrl(file: File, maxDim = 1024): Promise<string> {
  const img = document.createElement("img");
  const url = URL.createObjectURL(file);
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  URL.revokeObjectURL(url);
  return canvas.toDataURL("image/jpeg", 0.85);
}

function urgencyColor(u: string) {
  const s = u.toLowerCase();
  if (s.includes("cao")) return "bg-destructive text-destructive-foreground";
  if (s.includes("trung")) return "bg-amber-500 text-white";
  return "bg-emerald-500 text-white";
}

function DiagnosePage() {
  const diagnose = useServerFn(diagnoseDisease);
  const { gardens } = useFarmStore();
  const { data: history = [] } = useDiseaseChecks();
  const { deleteDiseaseCheck } = useFarmActions();

  const [gardenId, setGardenId] = useState<string>("none");
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Vui lòng chọn ảnh.");
    setLoading(true);
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setPreview(dataUrl);
      const gid = gardenId === "none" ? null : gardenId;
      await diagnose({ data: { imageDataUrl: dataUrl, gardenId: gid } });
      toast.success("Đã chẩn đoán xong!");
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi chẩn đoán");
    } finally { setLoading(false); }
  };

  return (
    <div>
      <AiWorkspaceTabs activeTab="diagnose" />
      <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary">
          <Stethoscope className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Chẩn đoán bệnh cây</h1>
          <p className="text-sm text-muted-foreground">Tải ảnh lá/cây, AI sẽ phân tích và đề xuất cách xử lý.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Tải ảnh chẩn đoán</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Khu vườn (không bắt buộc)</Label>
            <Select value={gardenId} onValueChange={setGardenId}>
              <SelectTrigger><SelectValue placeholder="Chọn khu vườn" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Không chọn</SelectItem>
                {gardens.map((g) => <SelectItem key={g.id} value={g.id}>{g.name} — {g.crop}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 p-8 text-center transition-colors hover:border-primary hover:bg-accent">
            {loading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Đang phân tích ảnh...</p>
                {preview && <img src={preview} alt="preview" className="mt-3 max-h-48 rounded-lg" />}
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-primary" />
                <p className="font-medium">Bấm để tải ảnh</p>
                <p className="text-xs text-muted-foreground">JPG, PNG — tối đa 10MB</p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              disabled={loading}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
            />
          </label>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Lịch sử chẩn đoán</h2>
        {history.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Chưa có chẩn đoán nào.</CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {history.map((h) => {
              const g = gardens.find((x) => x.id === h.gardenId);
              return (
                <Card key={h.id} className="overflow-hidden">
                  <img src={h.imageUrl} alt="diagnosis" className="h-48 w-full object-cover" />
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{h.diagnosis}</h3>
                          <Badge className={urgencyColor(h.urgency)}>{h.urgency}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(h.createdAt).toLocaleString("vi-VN")} · Độ tin cậy {Math.round(h.confidence)}%
                          {g && ` · ${g.name}`}
                        </p>
                      </div>
                      <Button size="icon" variant="ghost" onClick={async () => {
                        try { await deleteDiseaseCheck(h.id); toast.success("Đã xoá"); }
                        catch (e) { toast.error((e as Error).message); }
                      }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    {h.cause && <p className="text-sm"><span className="font-medium">Nguyên nhân:</span> {h.cause}</p>}
                    {h.recommendation && (
                      <p className="text-sm"><span className="font-medium">Xử lý:</span> {h.recommendation}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </div>
  );

}
