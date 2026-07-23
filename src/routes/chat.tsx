import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  callGemini,
  createThread,
  deleteThread,
  fileToBase64,
  getActiveThreadId,
  getSystemPrompt,
  getThreads,
  setActiveThreadId,
  updateThread,
  type ChatMessage,
  type ChatThread,
} from "@/lib/bara";
import { LogoFlame } from "@/components/LogoFlame";
import {
  Camera,
  Check,
  Copy,
  Forward,
  Github,
  Loader2,
  Menu,
  Plus,
  Send,
  Settings,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { MessageContent } from "@/components/MessageContent";
import { toast } from "sonner";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat — Bara AI v24.08" },
      { name: "description", content: "Chat with Bara AI, your Gemini-powered assistant." },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);

  const handleGithubImport = async () => {
    setAttachMenuOpen(false);
    const url = window.prompt("Masukkan URL repository GitHub (contoh: https://github.com/owner/repo)");
    if (!url) return;
    const match = url.match(/github\.com\/([^/]+)\/([^/?#]+)/);
    if (!match) {
      toast.error("URL GitHub tidak valid");
      return;
    }
    const [, owner, repoRaw] = match;
    const repo = repoRaw.replace(/\.git$/, "");
    setGithubLoading(true);
    try {
      const [infoRes, contentsRes] = await Promise.all([
        fetch(`https://api.github.com/repos/${owner}/${repo}`),
        fetch(`https://api.github.com/repos/${owner}/${repo}/contents/`),
      ]);
      if (!infoRes.ok) throw new Error("Repo tidak ditemukan");
      const info = await infoRes.json();
      const contents = contentsRes.ok ? await contentsRes.json() : [];
      const tree = Array.isArray(contents)
        ? contents.map((c: { name: string; type: string }) => `- ${c.name}${c.type === "dir" ? "/" : ""}`).join("\n")
        : "";
      const summary = `📦 GitHub Repository: ${owner}/${repo}\nURL: ${url}\nDeskripsi: ${info.description ?? "-"}\nBahasa: ${info.language ?? "-"}\n⭐ ${info.stargazers_count ?? 0} | 🍴 ${info.forks_count ?? 0}\n\nStruktur (root):\n${tree}`;
      setInput((prev) => (prev ? `${prev}\n\n${summary}` : summary));
      toast.success("Data repository ditambahkan ke pesan");
    } catch (e) {
      console.error("[BARA] GitHub import failed:", e);
      toast.error("Gagal mengambil data repository");
    } finally {
      setGithubLoading(false);
    }
  };

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

  const refreshThreads = () => setThreads(getThreads());

  useEffect(() => {
    if (!ready) return;
    let all = getThreads();
    let id = getActiveThreadId();
    if (!all.length) {
      const t = createThread();
      all = [t];
      id = t.id;
    } else if (!id || !all.find((t) => t.id === id)) {
      id = all[0].id;
      setActiveThreadId(id);
    }
    setThreads(all);
    setActiveId(id);
  }, [ready]);

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeId) ?? null,
    [threads, activeId],
  );
  const messages = activeThread?.messages ?? [];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, sending]);

  const persistMessages = (id: string, msgs: ChatMessage[]) => {
    const firstUser = msgs.find((m) => m.role === "user");
    const title = firstUser ? firstUser.content.slice(0, 40) : "New chat";
    updateThread(id, { messages: msgs, title });
    refreshThreads();
  };

  const runAssistant = async (id: string, history: ChatMessage[], files: File[]) => {
    setSending(true);
    try {
      const attachments = await Promise.all(files.map(fileToBase64));
      const reply = await callGemini({
        systemPrompt: getSystemPrompt(),
        messages: history,
        attachments,
      });
      const next = [
        ...history,
        { id: crypto.randomUUID(), role: "assistant" as const, content: reply, ts: Date.now() },
      ];
      persistMessages(id, next);
    } catch (err) {
      console.error("[BARA] Gemini call failed:", err);
      const message = err instanceof Error ? err.message : "";
      const friendly =
        message && !/status \d+/i.test(message)
          ? message
          : "Sorry cak, BARA is having trouble connecting. Please try again in a moment.";
      const next = [
        ...history,
        {
          id: crypto.randomUUID(),
          role: "assistant" as const,
          content: friendly,
          ts: Date.now(),
          error: true,
        },
      ];
      persistMessages(id, next);
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text && pendingFiles.length === 0) return;
    if (!activeId) return;
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text || `[Sent ${pendingFiles.length} file(s)]`,
      ts: Date.now(),
    };
    const next = [...messages, userMsg];
    persistMessages(activeId, next);
    setInput("");
    const files = pendingFiles;
    setPendingFiles([]);
    await runAssistant(activeId, next, files);
  };

  const retryLast = async () => {
    if (!activeId) return;
    let trimmed = [...messages];
    while (trimmed.length && trimmed[trimmed.length - 1].role === "assistant") {
      trimmed = trimmed.slice(0, -1);
    }
    if (!trimmed.length) return;
    persistMessages(activeId, trimmed);
    await runAssistant(activeId, trimmed, []);
  };

  const handleNewChat = () => {
    const t = createThread();
    refreshThreads();
    setActiveId(t.id);
    setSidebarOpen(false);
  };

  const handleSelectThread = (id: string) => {
    setActiveThreadId(id);
    setActiveId(id);
    setSidebarOpen(false);
  };

  const handleDeleteThread = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this chat?")) return;
    deleteThread(id);
    const all = getThreads();
    setThreads(all);
    if (activeId === id) {
      if (all.length) {
        setActiveThreadId(all[0].id);
        setActiveId(all[0].id);
      } else {
        const t = createThread();
        setThreads([t]);
        setActiveId(t.id);
      }
    }
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
    <div className="flex min-h-screen bg-[#0a0a0a] text-foreground">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-primary/20 bg-[#0b0710]/95 backdrop-blur-xl transition-transform md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-primary/20 px-4 py-3">
            <div className="flex items-center gap-2">
              <LogoFlame size={28} className="h-7 w-7" />
              <span className="text-sm font-bold neon-text">Bara AI</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-foreground md:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-3">
            <button
              onClick={handleNewChat}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground transition hover:brightness-110 neon-glow"
            >
              <Plus className="h-4 w-4" /> New Chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {threads.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                No conversations yet.
              </p>
            ) : (
              <ul className="space-y-1">
                {threads.map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => handleSelectThread(t.id)}
                      className={`group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                        t.id === activeId
                          ? "bg-primary/20 text-foreground neon-ring"
                          : "text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                      }`}
                    >
                      <span className="flex-1 truncate">{t.title || "New chat"}</span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => handleDeleteThread(t.id, e)}
                        className="rounded p-1 opacity-0 transition group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive"
                        aria-label="Delete chat"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-primary/20 bg-[#0a0a0a]/80 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-full p-2 text-muted-foreground transition hover:bg-primary/10 hover:text-foreground md:hidden"
                aria-label="Open sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>
              <LogoFlame size={32} className="h-8 w-8" />
              <div className="leading-tight">
                <div className="text-sm font-bold neon-text">Bara AI</div>
                <div className="text-[10px] text-muted-foreground">v24.08</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/settings"
                className="rounded-full p-2 text-muted-foreground transition hover:bg-primary/10 hover:text-foreground"
                aria-label="Settings"
              >
                <Settings className="h-5 w-5" />
              </Link>
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

        <div ref={scrollRef} className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center opacity-80">
              <LogoFlame size={96} className="h-24 w-24" />
              <h2 className="mt-4 text-2xl font-bold neon-text">
                Welcome, {displayName.split(" ")[0]}!
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Bara Official AI Assistant is ready to help you 🔥
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {messages.map((m) => (
                <li
                  key={m.id}
                  className={m.role === "user" ? "flex justify-end" : "flex flex-col items-start"}
                >
                  <div
                    className={
                      m.role === "user"
                        ? "max-w-[85%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-primary to-purple-700 px-4 py-2.5 text-sm text-primary-foreground neon-glow"
                        : "max-w-[85%] rounded-2xl rounded-tl-sm border border-primary/20 bg-[#141018] px-4 py-2.5 text-sm text-foreground"
                    }
                  >
                    {m.role === "assistant" ? (
                      <MessageContent content={m.content} />
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    )}
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
                  {m.role === "assistant" && !m.error && (
                    <MessageActions content={m.content} />
                  )}
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
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  setPendingFiles((p) => [...p, ...files]);
                  if (cameraRef.current) cameraRef.current.value = "";
                }}
              />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAttachMenuOpen((o) => !o)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary transition hover:bg-primary/20"
                  aria-label="Add attachment"
                  aria-expanded={attachMenuOpen}
                >
                  {githubLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : attachMenuOpen ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </button>
                {attachMenuOpen && (
                  <div className="absolute bottom-12 left-0 z-30 w-56 overflow-hidden rounded-xl border border-primary/30 bg-[#141018] shadow-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setAttachMenuOpen(false);
                        fileRef.current?.click();
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-foreground transition hover:bg-primary/10"
                    >
                      <Upload className="h-4 w-4 text-primary" />
                      Upload file
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachMenuOpen(false);
                        cameraRef.current?.click();
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-foreground transition hover:bg-primary/10"
                    >
                      <Camera className="h-4 w-4 text-primary" />
                      Kamera
                    </button>
                    <button
                      type="button"
                      onClick={handleGithubImport}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-foreground transition hover:bg-primary/10"
                    >
                      <Github className="h-4 w-4 text-primary" />
                      Impor repo GitHub
                    </button>
                  </div>
                )}
              </div>
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
    </div>
  );
}

function MessageActions({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const [reaction, setReaction] = useState<"up" | "down" | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error("[BARA] copy failed:", e);
    }
  };

  const handleForward = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: content });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Message copied — ready to share");
    } catch (e) {
      console.error("[BARA] share failed:", e);
    }
  };

  const iconBtn =
    "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-primary/15 hover:text-primary";

  return (
    <div className="ml-1 mt-1.5 flex items-center gap-1">
      <button
        onClick={() => setReaction((r) => (r === "up" ? null : "up"))}
        className={`${iconBtn} ${reaction === "up" ? "text-primary" : ""}`}
        aria-label="Like"
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => setReaction((r) => (r === "down" ? null : "down"))}
        className={`${iconBtn} ${reaction === "down" ? "text-destructive" : ""}`}
        aria-label="Dislike"
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
      <button onClick={handleForward} className={iconBtn} aria-label="Forward">
        <Forward className="h-3.5 w-3.5" />
      </button>
      <button onClick={handleCopy} className={iconBtn} aria-label="Copy">
        {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
