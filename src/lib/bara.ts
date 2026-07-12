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
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  if (attachments?.length && contents.length) {
    const last = contents[contents.length - 1];
    for (const a of attachments) {
      last.parts.push({ inline_data: { mime_type: a.mimeType, data: a.data } } as never);
    }
  }
  const body: Record<string, unknown> = { contents };
  if (systemPrompt.trim()) {
    body.system_instruction = { parts: [{ text: systemPrompt }] };
  }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini ${res.status}: ${t}`);
  }
  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
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
