const KEYS = {
  systemPrompt: "bara.systemPrompt",
  history: "bara.chatHistory",
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
  error?: boolean;
};

const isBrowser = () => typeof window !== "undefined";

export function getSystemPrompt(): string {
  if (!isBrowser()) return "";
  return localStorage.getItem(KEYS.systemPrompt) ?? "";
}
export function setSystemPrompt(v: string) {
  if (isBrowser()) localStorage.setItem(KEYS.systemPrompt, v);
}

export function getHistory(): ChatMessage[] {
  if (!isBrowser()) return [];
  try {
    return JSON.parse(localStorage.getItem(KEYS.history) ?? "[]");
  } catch {
    return [];
  }
}
export function setHistory(msgs: ChatMessage[]) {
  if (isBrowser()) localStorage.setItem(KEYS.history, JSON.stringify(msgs));
}
export function clearHistory() {
  if (isBrowser()) localStorage.removeItem(KEYS.history);
}

export async function callGemini(opts: {
  systemPrompt: string;
  messages: ChatMessage[];
  attachments?: { mimeType: string; data: string }[]; // base64 (no prefix)
}): Promise<string> {
  const { systemPrompt, messages, attachments } = opts;
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const combined = `${systemPrompt ? systemPrompt + "\n\n" : ""}${lastUser?.content ?? ""}`;
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
