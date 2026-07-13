import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  callGemini,
  clearHistory,
  fileToBase64,
  getHistory,
  getSystemPrompt,
  setHistory,
  type ChatMessage,
} from "@/lib/bara";
import { LogoFlame } from "@/components/LogoFlame";
import { Loader2, Paperclip, Send, Settings, LogOut, Trash2, Download } from "lucide-react";
import { MessageContent } from "@/components/MessageContent";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat — BARA AI v24.08" },
      { name: "description", content: "Chat with BARA AI, your personal Gemini-powered assistant." },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/" });
        return;
      }
      setUser(data.session.user);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/" });
      else setUser(session.user);
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (ready) setMessages(getHistory());
  }, [ready]);

  useEffect(() => {
    if (ready) setHistory(messages);
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, ready]);

  const runAssistant = async (history: ChatMessage[], files: File[]) => {
    setSending(true);
    try {
      const attachments = await Promise.all(files.map(fileToBase64));
      const reply = await callGemini({
        systemPrompt: getSystemPrompt(),
        messages: history,
        attachments,
      });
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "assistant", content: reply, ts: Date.now() },
      ]);
    } catch (err) {
      console.error("[BARA] Gemini call failed:", err);
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Sorry cak, BARA is having trouble connecting. Please try again in a moment.",
          ts: Date.now(),
          error: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text && pendingFiles.length === 0) return;
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text || `[Sent ${pendingFiles.length} file(s)]`,
      ts: Date.now(),
    };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    const files = pendingFiles;
    setPendingFiles([]);
    await runAssistant(next, files);
  };

  const retryLast = async () => {
    // Drop trailing error messages, keep prior conversation, resend
    let trimmed = [...messages];
    while (trimmed.length && trimmed[trimmed.length - 1].role === "assistant") {
      trimmed = trimmed.slice(0, -1);
    }
    if (!trimmed.length) return;
    setMessages(trimmed);
    await runAssistant(trimmed, []);
  };


  const handleClear = () => {
    if (!confirm("Clear all chat history?")) return;
    clearHistory();
    setMessages([]);
    setMenuOpen(false);
  };

  const handleExport = () => {
    const text = messages
      .map((m) => `[${new Date(m.ts).toLocaleString()}] ${m.role === "user" ? "You" : "BARA"}: ${m.content}`)
      .join("\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bara-chat-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setMenuOpen(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const avatar =
    (user?.user_metadata?.avatar_url as string | undefined) ??
    (user?.user_metadata?.picture as string | undefined) ??
    "";
  const displayName = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "You";

  return (
    <main className="flex min-h-screen flex-col bg-[#0a0a0a] text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-primary/20 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <LogoFlame size={32} className="h-8 w-8" />
            <div className="leading-tight">
              <div className="text-sm font-bold neon-text">BARA AI</div>
              <div className="text-[10px] text-muted-foreground">v24.08</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="rounded-full p-2 text-muted-foreground transition hover:bg-primary/10 hover:text-foreground"
                aria-label="Menu"
              >
                <Settings className="h-5 w-5" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl glass p-1 text-sm">
                  <Link
                    to="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-primary/15"
                  >
                    <Settings className="h-4 w-4" /> Settings
                  </Link>
                  <button
                    onClick={handleExport}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-primary/15"
                  >
                    <Download className="h-4 w-4" /> Export chat (.txt)
                  </button>
                  <button
                    onClick={handleClear}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-destructive hover:bg-destructive/15"
                  >
                    <Trash2 className="h-4 w-4" /> Clear chat
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-primary/15"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
            {avatar ? (
              <img
                src={avatar}
                alt={displayName}
                width={32}
                height={32}
                referrerPolicy="no-referrer"
                className="h-8 w-8 rounded-full border border-primary/40 neon-ring"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary/30 text-center text-sm leading-8">
                {displayName.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center opacity-80">
            <LogoFlame size={96} className="h-24 w-24" />
            <h2 className="mt-4 text-2xl font-bold neon-text">How can I help, {displayName.split(" ")[0]}?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Ask anything. Attach files or images with the + button.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {messages.map((m) => (
              <li
                key={m.id}
                className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-primary to-purple-700 px-4 py-2.5 text-sm text-primary-foreground neon-glow"
                      : "max-w-[85%] rounded-2xl rounded-tl-sm border border-primary/20 bg-[#141018] px-4 py-2.5 text-sm text-foreground"
                  }
                >
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  {m.error && (
                    <button
                      onClick={retryLast}
                      disabled={sending}
                      className="mt-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary transition hover:bg-primary/20 disabled:opacity-50"
                    >
                      Retry
                    </button>
                  )}
                </div>
              </li>
            ))}
            {sending && (
              <li className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-primary/20 bg-[#141018] px-4 py-3 text-sm text-muted-foreground">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-primary [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-primary [animation-delay:300ms]" />
                </div>
              </li>
            )}
          </ul>
        )}
      </div>

      {/* Composer */}
      <div className="sticky bottom-0 z-20 border-t border-primary/20 bg-[#0a0a0a]/90 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-3xl px-4 py-3">
          {pendingFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {pendingFiles.map((f, i) => (
                <span
                  key={i}
                  className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs"
                >
                  📎 {f.name}
                  <button
                    onClick={() => setPendingFiles((p) => p.filter((_, j) => j !== i))}
                    className="ml-2 text-muted-foreground hover:text-foreground"
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!sending) sendMessage();
            }}
            className="flex items-end gap-2 rounded-2xl glass p-2"
          >
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,application/pdf,text/*"
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                setPendingFiles((p) => [...p, ...files]);
                if (fileRef.current) fileRef.current.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary transition hover:bg-primary/20"
              aria-label="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!sending) sendMessage();
                }
              }}
              rows={1}
              placeholder="Write a message to BARA..."
              className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              type="submit"
              disabled={sending || (!input.trim() && pendingFiles.length === 0)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:brightness-110 neon-glow disabled:opacity-40"
              aria-label="Send"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
