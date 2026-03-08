"use client";

import { ReactNode } from "react";
import { splitToLines } from "@/lib/formatLines";

/**
 * 実際に表示する各行の、元テキスト（fullText）内での開始位置を返す。
 * splitToLines がスペースなしで文字数折り返しした場合も、正しく1箇所だけハイライトするために必要。
 */
function getLineStarts(fullText: string, lines: string[]): number[] {
  const starts: number[] = [];
  let pos = 0;
  for (let i = 0; i < lines.length; i++) {
    starts.push(pos);
    pos += lines[i].length;
    while (pos < fullText.length && /[\s\u3000]/.test(fullText[pos])) pos++;
  }
  return starts;
}

/**
 * 縦書きで「行」を列として表示（2行目1字下げ・3行目2字下げ＝margin-top）
 */
function VerticalLines({
  lines,
  indentPerLine = true,
  lineGap = true,
  className = "",
  highlightRange,
  fullText,
}: {
  lines: string[];
  indentPerLine?: boolean;
  lineGap?: boolean;
  className?: string;
  highlightRange?: { start: number; length: number };
  fullText?: string;
}) {
  const lineStarts =
    highlightRange != null && fullText != null && fullText.length > 0 && lines.length > 0
      ? getLineStarts(fullText, lines)
      : null;

  return (
    <div
      className={
        "flex flex-row-reverse flex-nowrap justify-end " +
        (lineGap ? "gap-6 " : "gap-2 ") +
        className
      }
    >
      {lines.map((line, i) => {
        const startIdx = lineStarts?.[i] ?? 0;
        const content =
          highlightRange != null
            ? Array.from(line).map((ch, j) => {
                const globalIdx = startIdx + j;
                const inRange =
                  globalIdx >= highlightRange.start &&
                  globalIdx < highlightRange.start + highlightRange.length;
                return (
                  <span
                    key={j}
                    className={inRange ? "text-red-600" : ""}
                  >
                    {ch}
                  </span>
                );
              })
            : line;
        return (
          <div
            key={i}
            className="writing-vertical font-serif"
            style={
              indentPerLine && i > 0
                ? { marginTop: `${i * 0.75}em` }
                : undefined
            }
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}

/** 百人一首風の札（縦書きテキスト用） */
export function PoemCard({
  children,
  className = "",
  text,
  variant,
  highlightRange,
}: {
  children?: ReactNode;
  className?: string;
  text?: string;
  variant?: "kami" | "shimo";
  /** variant+text 使用時、語呂部分を赤くする範囲（元テキストの start と length） */
  highlightRange?: { start: number; length: number };
}) {
  const lines = variant && text ? splitToLines(text, variant === "kami" ? 3 : 2) : [];
  const fullTextForStarts = variant && text ? text : "";

  const content =
    variant && text ? (
      <VerticalLines
        lines={lines}
        className="text-lg"
        highlightRange={highlightRange}
        fullText={fullTextForStarts}
      />
    ) : (
      children
    );

  return (
    <div
      className={
        "bg-amber-50 border-2 border-amber-200 rounded-lg shadow-md p-4 min-h-[120px] flex items-center justify-center " +
        className
      }
    >
      {variant && text ? content : (
        <div className="writing-vertical font-serif text-lg leading-loose">
          {content}
        </div>
      )}
    </div>
  );
}

/** 選択肢の札（クリック可能・〇×オーバーレイ付き） */
export function ChoiceCard({
  text,
  onClick,
  disabled,
  result,
  lines: linesProp,
  highlightRange,
}: {
  text: string;
  onClick: () => void;
  disabled: boolean;
  result: null | "correct" | "wrong";
  lines?: string[];
  highlightRange?: { start: number; length: number };
}) {
  const lines = linesProp ?? splitToLines(text, 2);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="relative bg-amber-50 border-2 border-amber-200 rounded-lg shadow-md p-4 min-h-[100px] flex items-center justify-center hover:border-amber-400 hover:bg-amber-100 disabled:pointer-events-none transition-colors"
    >
      <div className="w-full flex items-center justify-center">
        <VerticalLines
          lines={lines}
          lineGap
          className="text-base"
          highlightRange={highlightRange}
          fullText={text}
        />
      </div>
      {result === "correct" && (
        <span className="absolute inset-0 flex items-center justify-center text-5xl text-green-600 font-bold bg-black/10 rounded-lg">
          〇
        </span>
      )}
      {result === "wrong" && (
        <span className="absolute inset-0 flex items-center justify-center text-5xl text-red-600 font-bold bg-black/10 rounded-lg">
          ×
        </span>
      )}
    </button>
  );
}
