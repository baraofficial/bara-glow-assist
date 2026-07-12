const KEYS = {
  systemPrompt: "bara.systemPrompt",
  apiKey: "bara.geminiApiKey",
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

export function getApiKey(): string {
  if (!isBrowser()) return "";
  return localStorage.getItem(KEYS.apiKey) ?? "";
}
export function setApiKey(v: string) {
  if (isBrowser()) localStorage.setItem(KEYS.apiKey, v);
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
  apiKey: string;
  systemPrompt: string;
  messages: ChatMessage[];
  attachments?: { mimeType: string; data: string }[]; // base64 (no prefix)
}): Promise<string> {
  const { apiKey, systemPrompt, messages, attachments } = opts;
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const combined = `${systemPrompt ? systemPrompt + "\n\n" : ""}${lastUser?.content ?? ""}`;
  const parts: Array<Record<string, unknown>> = [{ text: combined }];
  if (attachments?.length) {
    for (const a of attachments) {
      parts.push({ inline_data: { mime_type: a.mimeType, data: a.data } });
    }
  }
  const body = { contents: [{ parts }] };
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (res.status !== 200) {
    const t = await res.text();
    throw new Error(`Gemini ${res.status}: ${t}`);
  }
  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  if (!text) throw new Error("Empty response from Gemini");
  return text;
}

export function resolveApiKey(): string {
  const envKey = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ?? "";
  return envKey || getApiKey();
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
