import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  clearAllThreads,
  getSystemPrompt,
  getThreads,
  setSystemPrompt,
} from "@/lib/bara";
import { ArrowLeft, Download, Lock, LogOut, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Bara AI v24.08" },
      { name: "description", content: "Manage your Bara AI account, chats, and preferences." },
    ],
  }),
  component: SettingsPage,
});

const OWNER_EMAIL =
  (import.meta.env.VITE_OWNER_EMAIL as string | undefined)?.toLowerCase() ??
  "bagoesrahmatulloh@gmail.com";

function SettingsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [prompt, setPrompt] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/" });
        return;
      }
      setUser(data.session.user);
      setPrompt(getSystemPrompt());
      setReady(true);
    });
  }, [navigate]);

  const email = user?.email?.toLowerCase() ?? "";
  const isOwner = email === OWNER_EMAIL;

  const savePrompt = () => {
    if (!isOwner) return;
    setSystemPrompt(prompt);
    toast.success("System prompt saved");
  };

  const handleExport = () => {
    const threads = getThreads();
    if (!threads.length) {
      toast.info("No chats to export");
      return;
    }
    const text = threads
      .map((t) => {
        const header = `=== ${t.title} (${new Date(t.updatedAt).toLocaleString()}) ===`;
        const body = t.messages
          .map(
            (m) =>
              `[${new Date(m.ts).toLocaleString()}] ${m.role === "user" ? "You" : "BARA"}: ${m.content}`,
          )
          .join("\n\n");
        return `${header}\n${body}`;
      })
      .join("\n\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bara-chat-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (!confirm("Clear all chat history? This cannot be undone.")) return;
    clearAllThreads();
    toast.success("All chats cleared");
    navigate({ to: "/chat" });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  if (!ready) return null;

  const avatar =
    (user?.user_metadata?.avatar_url as string | undefined) ??
    (user?.user_metadata?.picture as string | undefined) ??
    "";
  const displayName = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "You";

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-foreground">
      <header className="sticky top-0 z-10 border-b border-primary/20 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            to="/chat"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-primary/10 hover:text-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-bold neon-text">Settings</h1>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        {/* Account */}
        <section className="rounded-2xl glass p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">Account</h2>
          <div className="mt-4 flex items-center gap-4">
            {avatar ? (
              <img
                src={avatar}
                alt={displayName}
                width={56}
                height={56}
                referrerPolicy="no-referrer"
                className="h-14 w-14 rounded-full border border-primary/40 neon-ring"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/30 text-lg">
                {displayName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-base font-semibold">{displayName}</div>
              <div className="truncate text-sm text-muted-foreground">{user?.email}</div>
            </div>
          </div>
        </section>

        {/* System Prompt */}
        <section className="rounded-2xl glass p-5">
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
              System Prompt <Lock className="h-3.5 w-3.5 text-primary" aria-label="Locked" />
            </label>
            {!isOwner && (
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">
                Owner only
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Instructions BARA follows at the start of every conversation.
            {!isOwner && " Only the Owner role can edit this."}
          </p>
          <textarea
            value={prompt}
            onChange={(e) => isOwner && setPrompt(e.target.value)}
            readOnly={!isOwner}
            rows={8}
            placeholder="You are BARA, a helpful assistant..."
            className={`mt-3 w-full resize-y rounded-xl border border-primary/25 bg-black/40 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none ${
              isOwner ? "focus:border-primary focus:neon-ring" : "cursor-not-allowed opacity-70"
            }`}
          />
          {isOwner && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={savePrompt}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:brightness-110 neon-glow"
              >
                <Save className="h-4 w-4" /> Save
              </button>
            </div>
          )}
        </section>

        {/* Actions */}
        <section className="overflow-hidden rounded-2xl glass">
          <button
            onClick={handleExport}
            className="flex w-full items-center gap-3 border-b border-primary/15 px-5 py-4 text-left text-sm transition hover:bg-primary/10"
          >
            <Download className="h-4 w-4 text-primary" />
            <span className="flex-1">Export chat</span>
            <span className="text-xs text-muted-foreground">.txt</span>
          </button>
          <button
            onClick={handleClear}
            className="flex w-full items-center gap-3 border-b border-primary/15 px-5 py-4 text-left text-sm text-destructive transition hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
            <span className="flex-1">Clear chat</span>
          </button>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 px-5 py-4 text-left text-sm transition hover:bg-primary/10"
          >
            <LogOut className="h-4 w-4 text-primary" />
            <span className="flex-1">Sign out</span>
          </button>
        </section>
      </div>
    </main>
  );
}
