import { useEffect, useState, useSyncExternalStore } from "react";

export type Garden = {
  id: string;
  name: string;
  crop: string;
  area: number; // m2
  location: string;
  plantedAt: string; // ISO date
  notes?: string;
  createdAt: string;
};

export type ActivityType = "Tưới nước" | "Bón phân" | "Phun thuốc" | "Gieo trồng" | "Thu hoạch" | "Làm cỏ" | "Khác";

export const ACTIVITY_TYPES: ActivityType[] = [
  "Tưới nước",
  "Bón phân",
  "Phun thuốc",
  "Gieo trồng",
  "Thu hoạch",
  "Làm cỏ",
  "Khác",
];

export type ActivityLog = {
  id: string;
  gardenId: string;
  type: ActivityType;
  date: string; // ISO
  note: string;
  createdAt: string;
};

type FarmState = {
  gardens: Garden[];
  logs: ActivityLog[];
};

const KEY = "farm-store-v1";

const defaultState: FarmState = {
  gardens: [
    {
      id: "g1",
      name: "Vườn Rau Sau Nhà",
      crop: "Rau cải xanh",
      area: 120,
      location: "Khu A - Sau nhà",
      plantedAt: new Date(Date.now() - 12 * 86400000).toISOString().slice(0, 10),
      notes: "Đất tơi xốp, tưới sáng và chiều.",
      createdAt: new Date().toISOString(),
    },
    {
      id: "g2",
      name: "Vườn Cà Chua",
      crop: "Cà chua bi",
      area: 80,
      location: "Khu B - Nhà kính",
      plantedAt: new Date(Date.now() - 25 * 86400000).toISOString().slice(0, 10),
      notes: "Cần làm giàn leo.",
      createdAt: new Date().toISOString(),
    },
  ],
  logs: [
    {
      id: "l1",
      gardenId: "g1",
      type: "Tưới nước",
      date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
      note: "Tưới đẫm buổi sáng.",
      createdAt: new Date().toISOString(),
    },
    {
      id: "l2",
      gardenId: "g2",
      type: "Bón phân",
      date: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10),
      note: "Bón NPK 16-16-8.",
      createdAt: new Date().toISOString(),
    },
  ],
};

let state: FarmState = defaultState;
let hydrated = false;
const listeners = new Set<() => void>();

function loadInitial() {
  if (typeof window === "undefined") return;
  if (hydrated) return;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = JSON.parse(raw);
  } catch {}
  hydrated = true;
  listeners.forEach((l) => l());
}

function persist() {
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(state));
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const emptyState: FarmState = { gardens: [], logs: [] };

export function useFarmStore(): FarmState {
  useEffect(() => {
    loadInitial();
  }, []);
  const snap = useSyncExternalStore(
    subscribe,
    () => state,
    () => emptyState
  );
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? snap : emptyState;
}

export const farmActions = {
  addGarden(input: Omit<Garden, "id" | "createdAt">) {
    state = {
      ...state,
      gardens: [
        ...state.gardens,
        { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
      ],
    };
    persist();
  },
  deleteGarden(id: string) {
    state = {
      gardens: state.gardens.filter((g) => g.id !== id),
      logs: state.logs.filter((l) => l.gardenId !== id),
    };
    persist();
  },
  addLog(input: Omit<ActivityLog, "id" | "createdAt">) {
    state = {
      ...state,
      logs: [
        { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
        ...state.logs,
      ],
    };
    persist();
  },
  deleteLog(id: string) {
    state = { ...state, logs: state.logs.filter((l) => l.id !== id) };
    persist();
  },
};
