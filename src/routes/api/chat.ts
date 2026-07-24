import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const requestSchema = z.object({
  message: z.string().trim().min(1).max(50_000),
  attachments: z
    .array(
      z.object({
        mimeType: z.string().min(1).max(200),
        data: z.string().min(1).max(20_000_000),
      }),
    )
    .max(5)
    .optional(),
});

// Google direct Gemini API model. Change here if you want a different one.
const GEMINI_MODEL = "gemini-2.5-flash";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
          const backendUrl = process.env.SUPABASE_URL;
          const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
          if (!token || !backendUrl || !publishableKey) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const backend = createClient(backendUrl, publishableKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { error: authError } = await backend.auth.getUser(token);
          if (authError) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const geminiKey = process.env.GEMINI_API_KEY;
          if (!geminiKey) {
            console.error("[BARA] GEMINI_API_KEY is not configured");
            return Response.json(
              { error: "Gagal: Cek API Key di Vercel" },
              { status: 503 },
            );
          }

          const parsed = requestSchema.safeParse(await request.json());
          if (!parsed.success) {
            return Response.json({ error: "Invalid request" }, { status: 400 });
          }

          const parts: Array<
            | { text: string }
            | { inline_data: { mime_type: string; data: string } }
          > = [{ text: parsed.data.message }];
          for (const a of parsed.data.attachments ?? []) {
            parts.push({ inline_data: { mime_type: a.mimeType, data: a.data } });
          }

          const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(geminiKey)}`;
          const geminiRes = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts }],
            }),
          });

          if (!geminiRes.ok) {
            const bodyText = await geminiRes.text().catch(() => "");
            console.error("[BARA] Gemini error", geminiRes.status, bodyText);
            if (geminiRes.status === 400 || geminiRes.status === 401 || geminiRes.status === 403) {
              return Response.json(
                { error: "Gagal: Cek API Key di Vercel" },
                { status: geminiRes.status },
              );
            }
            if (geminiRes.status === 429) {
              return Response.json(
                { error: "BARA sedang ramai. Tunggu sebentar lalu coba lagi." },
                { status: 429 },
              );
            }
            return Response.json(
              { error: "Gagal: Cek API Key di Vercel" },
              { status: 502 },
            );
          }

          const data = (await geminiRes.json()) as {
            candidates?: Array<{
              content?: { parts?: Array<{ text?: string }> };
            }>;
          };
          const text =
            data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";

          if (!text) {
            console.error("[BARA] Gemini returned an empty response");
            return Response.json(
              { error: "Gagal: Cek API Key di Vercel" },
              { status: 502 },
            );
          }

          return Response.json({ text });
        } catch (error) {
          console.error("[BARA] Gemini proxy failed:", error);
          return Response.json(
            { error: "Gagal: Cek API Key di Vercel" },
            { status: 502 },
          );
        }
      },
    },
  },
});
