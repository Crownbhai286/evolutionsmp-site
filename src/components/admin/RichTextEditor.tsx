"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link as LinkIcon,
  Code,
  RemoveFormatting,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

function sanitizeBasicHtml(html: string): string {
  return html
    .replace(/<\s*(script|iframe|object|embed|style|link|meta)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write article body content...",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [sourceMode, setSourceMode] = useState(false);

  useEffect(() => {
    if (!sourceMode && editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value, sourceMode]);

  const exec = (cmd: string, arg?: string) => {
    if (sourceMode) return;
    editorRef.current?.focus();
    document.execCommand(cmd, false, arg);
    if (editorRef.current) {
      onChange(sanitizeBasicHtml(editorRef.current.innerHTML));
    }
  };

  const handleLink = () => {
    if (sourceMode) return;
    const url = window.prompt("Enter link URL (https://... or /store):", "https://");
    if (!url) return;
    exec("createLink", url.trim());
  };

  const toolbarButtons = [
    { icon: Bold, label: "Bold", onClick: () => exec("bold") },
    { icon: Italic, label: "Italic", onClick: () => exec("italic") },
    { icon: Heading2, label: "Heading 2", onClick: () => exec("formatBlock", "h2") },
    { icon: Heading3, label: "Heading 3", onClick: () => exec("formatBlock", "h3") },
    { icon: List, label: "Bullet List", onClick: () => exec("insertUnorderedList") },
    { icon: ListOrdered, label: "Numbered List", onClick: () => exec("insertOrderedList") },
    { icon: LinkIcon, label: "Insert Link", onClick: handleLink },
    { icon: RemoveFormatting, label: "Clear Formatting", onClick: () => exec("removeFormat") },
  ];

  return (
    <div className="rounded-xl border border-white/[0.12] bg-[#0a0d22] overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#141a42] border-b border-white/[0.08]">
        <div className="flex flex-wrap items-center gap-1">
          {toolbarButtons.map((btn) => {
            const Icon = btn.icon;
            return (
              <button
                key={btn.label}
                type="button"
                title={btn.label}
                disabled={sourceMode}
                onClick={btn.onClick}
                className="p-1.5 rounded-lg text-[#c7ccf0] hover:text-white hover:bg-white/[0.08] disabled:opacity-40 transition-colors"
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setSourceMode((prev) => !prev)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
            sourceMode
              ? "bg-[#ff9a1f] text-[#0a0d22]"
              : "bg-white/[0.06] text-[#a3abd6] hover:text-white"
          }`}
        >
          <Code className="h-3.5 w-3.5" />
          <span>{sourceMode ? "Visual Editor" : "HTML Source"}</span>
        </button>
      </div>

      {sourceMode ? (
        <textarea
          rows={10}
          value={value}
          onChange={(e) => onChange(sanitizeBasicHtml(e.target.value))}
          placeholder={placeholder}
          className="w-full p-4 bg-[#0a0d22] text-xs font-mono text-[#e2e8f0] focus:outline-none resize-y"
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => onChange(sanitizeBasicHtml((e.currentTarget as HTMLDivElement).innerHTML))}
          data-placeholder={placeholder}
          className="min-h-[220px] max-h-[420px] overflow-y-auto p-4 text-sm text-[#e2e8f0] leading-relaxed focus:outline-none [&_h2]:font-head [&_h2]:text-xl [&_h2]:text-white [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:font-head [&_h3]:text-lg [&_h3]:text-white [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-[#ff9a1f] [&_a]:underline empty:before:content-[attr(data-placeholder)] empty:before:text-slate-500"
        />
      )}
    </div>
  );
}
