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

          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) {
            console.error("[BARA] LOVABLE_API_KEY is not configured");
            return Response.json({ error: "Unable to connect" }, { status: 503 });
          }

          const parsed = requestSchema.safeParse(await request.json());
          if (!parsed.success) {
            return Response.json({ error: "Invalid request" }, { status: 400 });
          }

          const userContent: Array<
            { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }
          > = [{ type: "text", text: parsed.data.message }];
          for (const a of parsed.data.attachments ?? []) {
            if (a.mimeType.startsWith("image/")) {
              userContent.push({
                type: "image_url",
                image_url: { url: `data:${a.mimeType};base64,${a.data}` },
              });
            }
          }

          const gwRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-pro",
              messages: [{ role: "user", content: userContent }],
            }),
          });

          if (!gwRes.ok) {
            const errText = await gwRes.text();
            console.error("[BARA] Lovable AI gateway error:", gwRes.status, errText);
            if (gwRes.status === 402) {
              return Response.json(
                { error: "AI credits exhausted. Please add credits in Lovable workspace billing." },
                { status: 402 },
              );
            }
            if (gwRes.status === 429) {
              return Response.json(
                { error: "Rate limit reached. Please wait a moment and try again." },
                { status: 429 },
              );
            }
            return Response.json({ error: "Unable to connect" }, { status: 502 });
          }

          const gwData = (await gwRes.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const text = gwData.choices?.[0]?.message?.content ?? "";

          if (!text) {
            console.error("[BARA] Gateway returned an empty response");
            return Response.json({ error: "Unable to connect" }, { status: 502 });
          }

          return Response.json({ text });

        } catch (error) {
          console.error("[BARA] Gemini proxy failed:", error);
          return Response.json({ error: "Unable to connect" }, { status: 502 });
        }
      },
    },
  },
});