import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Loader2, Send, Leaf, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { chatWithAssistant } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({
    meta: [
      { title: "Trợ lý AI — Nông Trại Xanh" },
      { name: "description", content: "Chat với trợ lý AI hiểu rõ dữ liệu nông trại của bạn." },
      { property: "og:title", content: "Trợ lý AI — Nông Trại Xanh" },
      { property: "og:description", content: "Chat với trợ lý AI hiểu rõ dữ liệu nông trại của bạn." },
    ],
  }),
  component: AssistantPage,
});

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS_FARM = [
  "Tôi đã bón phân bao nhiêu lần tháng này?",
  "Chi phí tháng này là bao nhiêu?",
  "Khu nào tốn nhiều chi phí nhất?",
  "Lần phun thuốc gần nhất là khi nào?",
];

const SUGGESTIONS_EXPERT = [
  "Cà phê bị vàng lá thì xử lý thế nào?",
  "Khi nào nên bón phân cho sầu riêng?",
  "Cách phòng bệnh chết nhanh trên hồ tiêu?",
  "Lịch tưới nước cho cà phê mùa khô Đắk Lắk?",
];

function AssistantPage() {
  const chat = useServerFn(chatWithAssistant);
  const [mode, setMode] = useState<"farm" | "expert">("farm");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await chat({ data: { mode, messages: next } });
      setMessages([...next, { role: "assistant", content: res.content }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra");
      setMessages(next);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = mode === "farm" ? SUGGESTIONS_FARM : SUGGESTIONS_EXPERT;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <AiWorkspaceTabs activeTab="assistant" />
      <div className="border-b border-border bg-background/80 backdrop-blur">

        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Trợ lý AI</h1>
              <p className="text-xs text-muted-foreground">
                {mode === "farm" ? "Đọc dữ liệu nông trại của bạn" : "Chuyên gia Tây Nguyên"}
              </p>
            </div>
          </div>
          <div className="flex rounded-full border border-border bg-muted p-1 text-xs">
            <button
              onClick={() => setMode("farm")}
              className={cn(
                "rounded-full px-3 py-1.5 font-medium transition-colors",
                mode === "farm" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              Trợ lý cá nhân
            </button>
            <button
              onClick={() => setMode("expert")}
              className={cn(
                "rounded-full px-3 py-1.5 font-medium transition-colors",
                mode === "expert" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              Chuyên gia
            </button>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center py-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary">
                <Leaf className="h-8 w-8 text-primary-foreground" />
              </div>
              <h2 className="mt-4 text-xl font-semibold">
                {mode === "farm" ? "Hỏi gì về nông trại của bạn?" : "Hỏi chuyên gia nông nghiệp"}
              </h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                {mode === "farm"
                  ? "Tôi đọc trực tiếp dữ liệu khu vườn và nhật ký của bạn từ Lovable Cloud."
                  : "Tôi tư vấn cà phê, sầu riêng, hồ tiêu và cây ăn trái tại Đắk Lắk."}
              </p>
              <div className="mt-6 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-lg border border-border bg-card p-3 text-left text-sm transition-colors hover:border-primary hover:bg-accent"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}>
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  m.role === "user" ? "bg-primary text-primary-foreground" : "gradient-primary text-primary-foreground",
                )}
              >
                {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div
                className={cn(
                  "max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  m.role === "user"
                    ? "rounded-tr-sm bg-primary text-primary-foreground"
                    : "rounded-tl-sm border border-border bg-card",
                )}
              >
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full gradient-primary">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-4xl p-3 md:p-4">
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2 focus-within:border-primary"
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder={mode === "farm" ? "Hỏi về khu vườn, chi phí, hoạt động..." : "Hỏi chuyên gia về cây trồng..."}
              rows={1}
              className="min-h-[40px] resize-none border-0 bg-transparent focus-visible:ring-0"
              disabled={loading}
            />
            <Button type="submit" size="icon" disabled={loading || !input.trim()} className="gradient-primary text-primary-foreground">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
