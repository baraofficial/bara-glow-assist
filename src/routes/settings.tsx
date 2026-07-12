import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSystemPrompt, setSystemPrompt } from "@/lib/bara";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — BARA AI v24.08" },
      { name: "description", content: "Configure your BARA AI system prompt." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [prompt, setPrompt] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/" });
        return;
      }
      setPrompt(getSystemPrompt());
      setReady(true);
    });
  }, [navigate]);

  const save = () => {
    setSystemPrompt(prompt);
    toast.success("Settings saved");
  };

  if (!ready) return null;

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

      <div className="mx-auto max-w-2xl px-4 py-8">
        <section className="rounded-2xl glass p-5">
          <label className="block text-sm font-semibold text-foreground">System Prompt</label>
          <p className="mt-1 text-xs text-muted-foreground">
            Instructions BARA will follow at the start of every conversation.
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={8}
            placeholder="You are BARA, a helpful assistant..."
            className="mt-3 w-full resize-y rounded-xl border border-primary/25 bg-black/40 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:neon-ring"
          />
        </section>

        <div className="mt-6 flex justify-end">
          <button
            onClick={save}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition hover:brightness-110 neon-glow"
          >
            <Save className="h-4 w-4" /> Save
          </button>
        </div>
      </div>
    </main>
  );
}
