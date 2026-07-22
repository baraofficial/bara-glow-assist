import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import { GoogleGenerativeAI } from "@google/generative-ai";
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

          const apiKey = process.env.GEMINI_API_KEY;
          if (!apiKey) {
            console.error("[BARA] GEMINI_API_KEY is not configured");
            return Response.json({ error: "Unable to connect" }, { status: 503 });
          }

          const parsed = requestSchema.safeParse(await request.json());
          if (!parsed.success) {
            return Response.json({ error: "Invalid request" }, { status: 400 });
          }

          const userContent: Array<
            { text: string } | { inlineData: { data: string; mimeType: string } }
          > = [{ text: parsed.data.message }];
          for (const a of parsed.data.attachments ?? []) {
            if (a.mimeType.startsWith("image/")) {
              userContent.push({
                inlineData: { data: a.data, mimeType: a.mimeType },
              });
            }
          }

          const gemini = new GoogleGenerativeAI(apiKey);
          const model = gemini.getGenerativeModel({ model: "gemini-2.5-flash" });
          const result = await model.generateContent(userContent);
          const text = result.response.text();

          if (!text) {
            console.error("[BARA] Gateway returned an empty response");
            return Response.json({ error: "Unable to connect" }, { status: 502 });
          }

          return Response.json({ text });

        } catch (error) {
          console.error("[BARA] Gemini proxy failed:", error);
          const status =
            typeof error === "object" && error !== null
              ? Number("statusCode" in error ? error.statusCode : "status" in error ? error.status : 0)
              : 0;
          if (status === 429) {
            return Response.json(
              { error: "BARA sedang ramai. Tunggu sebentar lalu coba lagi." },
              { status: 429 },
            );
          }
          return Response.json({ error: "Unable to connect" }, { status: 502 });
        }
      },
    },
  },
});