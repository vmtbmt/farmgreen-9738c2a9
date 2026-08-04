import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

const tabs = [
  { key: "assistant", label: "Trợ lý AI", to: "/assistant" },
  { key: "diagnose", label: "Chẩn đoán bệnh", to: "/diagnose" },
  { key: "reports", label: "Báo cáo AI", to: "/reports" },
] as const;

export function AiWorkspaceTabs({ activeTab }: { activeTab: (typeof tabs)[number]["key"] }) {
  return (
    <nav aria-label="Điều hướng AI" className="overflow-x-auto border-b bg-background">
      <div className="mx-auto flex min-w-max max-w-5xl gap-1 px-4 py-2">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            to={tab.to}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              activeTab === tab.key && "bg-primary/10 text-primary",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
