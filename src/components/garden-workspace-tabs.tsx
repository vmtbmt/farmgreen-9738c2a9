import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

const tabs = [
  { key: "overview", label: "Tổng quan", to: "/gardens/$gardenId" },
  { key: "tasks", label: "Công việc", to: "/gardens/$gardenId/tasks" },
  { key: "journal", label: "Ghi nhật ký", to: "/gardens/$gardenId/journal" },
  { key: "logs", label: "Lịch sử nhật ký", to: "/gardens/$gardenId/logs" },

  { key: "expenses", label: "Chi phí", to: "/gardens/$gardenId/expenses" },
  { key: "photos", label: "Ảnh", to: "/gardens/$gardenId/photos" },
  { key: "settings", label: "Cài đặt", to: "/gardens/$gardenId/settings" },
] as const;


export function GardenWorkspaceTabs({
  gardenId,
  activeTab,
}: {
  gardenId: string;
  activeTab: (typeof tabs)[number]["key"];
}) {
  return (
    <nav
      aria-label="Điều hướng khu vườn"
      className="-mx-4 overflow-x-auto border-y px-4 sm:mx-0 sm:rounded-lg sm:border"
    >
      <div className="flex min-w-max gap-1 py-2">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            to={tab.to}
            params={{ gardenId }}
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
