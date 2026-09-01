"use client";

import { Fragment, useMemo, type CSSProperties } from "react";
import katex from "katex";

/**
 * Renders passage/stem/explanation text with inline ($...$) and block
 * ($$...$$) LaTeX segments as real KaTeX, everything else as plain text.
 * Used both for the live editor preview and (later) the read-only views.
 */
export function MathText({
  text,
  className,
  style,
}: {
  text: string;
  className?: string;
  style?: CSSProperties;
}) {
  const parts = useMemo(() => splitMath(text), [text]);

  return (
    <div className={className} style={{ whiteSpace: "pre-wrap", ...style }}>
      {parts.map((part, i) => {
        if (part.type === "text") return <Fragment key={i}>{part.value}</Fragment>;
        const html = katex.renderToString(part.value, {
          throwOnError: false,
          displayMode: part.type === "block-math",
        });
        return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
      })}
    </div>
  );
}

type Segment =
  | { type: "text"; value: string }
  | { type: "inline-math" | "block-math"; value: string };

function splitMath(text: string): Segment[] {
  const segments: Segment[] = [];
  const re = /\$\$([\s\S]+?)\$\$|\$([\s\S]+?)\$/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text))) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) {
      segments.push({ type: "block-math", value: match[1] });
    } else {
      segments.push({ type: "inline-math", value: match[2] });
    }
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }
  return segments;
}
