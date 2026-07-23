import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { parseFarmLog } from "@/lib/ai-parse.functions";
import { useFarmStore, useFarmActions, ACTIVITY_TYPES, type ActivityType } from "@/lib/farm-store";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({
    meta: [
      { title: "Trợ lý AI — Nông Trại Xanh" },
      { name: "description", content: "Ghi nhật ký nông trại bằng ngôn ngữ tự nhiên với AI." },
      { property: "og:title", content: "Trợ lý AI — Nông Trại Xanh" },
      { property: "og:description", content: "Ghi nhật ký nông trại bằng ngôn ngữ tự nhiên với AI." },
    ],
  }),
  component: AssistantPage,
});

type Parsed = {
  activity_type: string;
  quantity: string;
  material: string;
  field_name: string;
};

function AssistantPage() {
  const parse = useServerFn(parseFarmLog);
  const { gardens } = useFarmStore();
  const { addLog } = useFarmActions();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<Parsed | null>(null);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const parsed = await parse({ data: { text: trimmed } });
      setLastResult(parsed);

      const garden = gardens.find(
        (g) =>
          g.name.toLowerCase() === parsed.field_name.toLowerCase() ||
          g.name.toLowerCase().includes(parsed.field_name.toLowerCase()),
      );
      if (!garden) {
        toast.error(`Không tìm thấy khu vườn "${parsed.field_name}". Vui lòng tạo trước.`);
        return;
      }

      const type = (ACTIVITY_TYPES as string[]).includes(parsed.activity_type)
        ? (parsed.activity_type as ActivityType)
        : "Khác";

      const noteParts = [parsed.quantity, parsed.material].filter(Boolean).join(" ");
      const note = noteParts ? `${noteParts} — ${trimmed}` : trimmed;

      await addLog({
        gardenId: garden.id,
        type,
        date: new Date().toISOString().slice(0, 10),
        note,
      });

      toast.success(`Đã lưu: ${type} tại ${garden.name}`);
      setText("");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Trợ lý AI</h1>
          <p className="text-sm text-muted-foreground">
            Nhập nhật ký bằng ngôn ngữ tự nhiên, AI sẽ tự động lưu vào hệ thống.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ghi nhật ký nhanh</CardTitle>
          <CardDescription>
            Ví dụ: "Hôm nay bón 4 bao NPK cho khu A" hoặc "Tưới 200 lít nước cho khu B"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Nhập hoạt động của bạn..."
            rows={4}
            disabled={loading}
          />
          <Button onClick={handleSubmit} disabled={loading || !text.trim()} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang phân tích...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" /> Phân tích & lưu
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kết quả phân tích gần nhất</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-md bg-muted p-4 text-sm">
{JSON.stringify(lastResult, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
