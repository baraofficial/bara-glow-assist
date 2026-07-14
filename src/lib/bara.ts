import { supabase } from "@/integrations/supabase/client";

const KEYS = {
  systemPrompt: "bara.systemPrompt",
  history: "bara.chatHistory", // legacy single-thread history
  threads: "bara.threads",
  activeThread: "bara.activeThreadId",
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
  error?: boolean;
};

export type ChatThread = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
};

const isBrowser = () => typeof window !== "undefined";

export function getSystemPrompt(): string {
  if (!isBrowser()) return "";
  return localStorage.getItem(KEYS.systemPrompt) ?? "";
}
export function setSystemPrompt(v: string) {
  if (isBrowser()) localStorage.setItem(KEYS.systemPrompt, v);
}

// ── Threads ────────────────────────────────────────────────────────────────
function readThreads(): ChatThread[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(KEYS.threads);
    if (raw) return JSON.parse(raw) as ChatThread[];
  } catch {
    // fallthrough
  }
  // migrate legacy single history
  try {
    const legacy = localStorage.getItem(KEYS.history);
    if (legacy) {
      const msgs = JSON.parse(legacy) as ChatMessage[];
      if (Array.isArray(msgs) && msgs.length) {
        const t: ChatThread = {
          id: crypto.randomUUID(),
          title: msgs.find((m) => m.role === "user")?.content.slice(0, 40) || "Chat",
          messages: msgs,
          updatedAt: Date.now(),
        };
        localStorage.setItem(KEYS.threads, JSON.stringify([t]));
        return [t];
      }
    }
  } catch {
    // ignore
  }
  return [];
}

export function getThreads(): ChatThread[] {
  return readThreads().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function saveThreads(threads: ChatThread[]) {
  if (isBrowser()) localStorage.setItem(KEYS.threads, JSON.stringify(threads));
}

export function getActiveThreadId(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(KEYS.activeThread);
}

export function setActiveThreadId(id: string | null) {
  if (!isBrowser()) return;
  if (id) localStorage.setItem(KEYS.activeThread, id);
  else localStorage.removeItem(KEYS.activeThread);
}

export function createThread(): ChatThread {
  const t: ChatThread = {
    id: crypto.randomUUID(),
    title: "New chat",
    messages: [],
    updatedAt: Date.now(),
  };
  const all = [t, ...readThreads()];
  saveThreads(all);
  setActiveThreadId(t.id);
  return t;
}

export function updateThread(id: string, patch: Partial<ChatThread>) {
  const all = readThreads().map((t) => (t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t));
  saveThreads(all);
}

export function deleteThread(id: string) {
  const all = readThreads().filter((t) => t.id !== id);
  saveThreads(all);
  if (getActiveThreadId() === id) setActiveThreadId(all[0]?.id ?? null);
}

export function clearAllThreads() {
  if (!isBrowser()) return;
  localStorage.removeItem(KEYS.threads);
  localStorage.removeItem(KEYS.activeThread);
  localStorage.removeItem(KEYS.history);
}

// ── Gemini call ────────────────────────────────────────────────────────────
export async function callGemini(opts: {
  systemPrompt: string;
  messages: ChatMessage[];
  attachments?: { mimeType: string; data: string }[];
}): Promise<string> {
  const { systemPrompt, messages, attachments } = opts;
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const combined = `${systemPrompt ? systemPrompt + "\n\n" : ""}${lastUser?.content ?? ""}`;
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("No authenticated session");

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ message: combined, attachments }),
  });
  if (res.status !== 200) throw new Error(`Chat request failed with status ${res.status}`);

  const data = (await res.json()) as { text?: string };
  const text = data.text ?? "";
  if (!text) throw new Error("Empty response from Gemini");
  return text;
}

export function fileToBase64(file: File): Promise<{ mimeType: string; data: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      resolve({ mimeType: file.type || "application/octet-stream", data: base64 });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
