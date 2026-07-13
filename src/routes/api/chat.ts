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

          const apiKey = process.env.GEMINI_API_KEY;
          if (!apiKey) {
            console.error("[BARA] GEMINI_API_KEY is not configured");
            return Response.json({ error: "Unable to connect" }, { status: 503 });
          }

          const parsed = requestSchema.safeParse(await request.json());
          if (!parsed.success) {
            return Response.json({ error: "Invalid request" }, { status: 400 });
          }

          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
          const parts = [
            { text: parsed.data.message },
            ...(parsed.data.attachments ?? []).map((attachment) => ({
              inlineData: {
                mimeType: attachment.mimeType,
                data: attachment.data,
              },
            })),
          ];
          const result = await model.generateContent(parts);
          const text = result.response.text();

          if (!text) {
            console.error("[BARA] Gemini returned an empty response");
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