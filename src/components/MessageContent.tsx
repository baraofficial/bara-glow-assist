import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Code2, Copy } from "lucide-react";

type Part = { type: "text"; text: string } | { type: "code"; lang: string; code: string };

function parseParts(content: string): Part[] {
  const parts: Part[] = [];
  const regex = /```([a-zA-Z0-9_+-]*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", text: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: "code", lang: match[1] || "code", code: match[2].replace(/\n$/, "") });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < content.length) {
    parts.push({ type: "text", text: content.slice(lastIndex) });
  }
  return parts.length ? parts : [{ type: "text", text: content }];
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const lines = code.split("\n").length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error("[BARA] copy failed:", e);
    }
  };

  return (
    <div className="my-2 overflow-hidden rounded-xl border border-primary/30 bg-[#0a0a0a]/80">
      <div className="flex items-center justify-between gap-2 border-b border-primary/20 bg-primary/10 px-3 py-2">
        <div className="flex items-center gap-2 text-xs">
          <Code2 className="h-3.5 w-3.5 text-primary" />
          <span className="font-mono font-semibold uppercase tracking-wider text-primary">
            {lang}
          </span>
          <span className="text-muted-foreground">· {lines} lines</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] text-primary transition hover:bg-primary/20"
          >
            {open ? (
              <>
                <ChevronUp className="h-3 w-3" /> Hide
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" /> View code
              </>
            )}
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] text-primary transition hover:bg-primary/20"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" /> Copy
              </>
            )}
          </button>
        </div>
      </div>
      {open && (
        <pre className="max-h-96 overflow-auto bg-[#050505] p-3 text-xs leading-relaxed text-foreground/90">
          <code className="font-mono">{code}</code>
        </pre>
      )}
    </div>
  );
}

export function MessageContent({ content }: { content: string }) {
  const parts = parseParts(content);
  return (
    <div className="space-y-1">
      {parts.map((p, i) =>
        p.type === "text" ? (
          p.text.trim() ? (
            <p key={i} className="whitespace-pre-wrap break-words">
              {p.text.trim()}
            </p>
          ) : null
        ) : (
          <CodeBlock key={i} lang={p.lang} code={p.code} />
        ),
      )}
    </div>
  );
}
