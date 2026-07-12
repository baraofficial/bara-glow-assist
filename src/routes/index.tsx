import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import logo from "@/assets/bara-logo.png";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BARA AI v24.08 — Your Personal AI Assistant" },
      { name: "description", content: "BARA AI — Personal AI assistant from Bara Official. Powered by Gemini." },
      { property: "og:title", content: "BARA AI v24.08" },
      { property: "og:description", content: "Your Personal AI Assistant from Bara Official." },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/chat" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/chat" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Sign-in failed. Please try again.");
        setLoading(false);
        return;
      }
      if (result.redirected) return;
    } catch {
      toast.error("Sign-in failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0a0a] text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.35),transparent_70%)] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(10,10,10,0.6)_60%,#0a0a0a)]" />
      </div>

      <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-12">
        <div className="flex flex-col items-center text-center">
          <img
            src={logo}
            alt="BARA AI logo"
            width={160}
            height={160}
            className="logo-glow h-40 w-40 select-none"
          />

          <h1 className="mt-8 text-5xl font-black tracking-tight sm:text-6xl neon-text">
            BARA AI v20
          </h1>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground sm:text-base">
            Your Personal AI Assistant from Bara Official
          </p>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="group mt-10 inline-flex items-center gap-3 rounded-full glass px-6 py-3 text-sm font-medium text-foreground transition hover:neon-ring disabled:opacity-60"
          >
            <GoogleIcon />
            <span>{loading ? "Connecting…" : "Continue with Google"}</span>
          </button>

          <p className="mt-6 text-xs text-muted-foreground/70">v24.08 • Powered by Gemini</p>
        </div>
      </section>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.1 35 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.9l-6.5 5C9.4 39.6 16.1 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.6l6.2 5.2C41 34.7 44 30 44 24c0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}
