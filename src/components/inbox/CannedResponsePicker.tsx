"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ICannedResponse } from "@/types";

interface MergeContext {
  agentName: string;
  customerName: string;
  platform: string;
}

interface CannedResponsePickerProps {
  query: string;
  context: MergeContext;
  onSelect: (text: string) => void;
  onClose: () => void;
}

function applyMergeTags(body: string, ctx: MergeContext): string {
  return body
    .replace(/\{agent_name\}/g, ctx.agentName)
    .replace(/\{customer_name\}/g, ctx.customerName)
    .replace(/\{platform\}/g, ctx.platform);
}

export function CannedResponsePicker({
  query,
  context,
  onSelect,
  onClose,
}: CannedResponsePickerProps) {
  const [responses, setResponses] = useState<ICannedResponse[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const fetchResponses = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      const res = await fetch(`/api/canned-responses?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setResponses(data.cannedResponses ?? []);
        setActiveIndex(0);
      }
    } catch {
      // ignore fetch errors silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResponses(query);
  }, [query, fetchResponses]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!responses.length) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => {
          const next = Math.min(prev + 1, responses.length - 1);
          itemRefs.current[next]?.scrollIntoView({ block: "nearest" });
          return next;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => {
          const next = Math.max(prev - 1, 0);
          itemRefs.current[next]?.scrollIntoView({ block: "nearest" });
          return next;
        });
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = responses[activeIndex];
        if (selected) {
          onSelect(applyMergeTags(selected.body, context));
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [responses, activeIndex, context, onSelect, onClose]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  if (!loading && responses.length === 0) {
    return (
      <div
        ref={containerRef}
        className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3 text-sm text-gray-500"
      >
        No canned responses found
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden"
    >
      <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
          Canned Responses
        </span>
        <span className="text-xs text-gray-400">↑↓ navigate · Enter to insert · Esc to close</span>
      </div>

      {loading ? (
        <div className="p-3 text-sm text-gray-400 text-center">Loading…</div>
      ) : (
        <ul className="max-h-64 overflow-y-auto py-1" role="listbox">
          {responses.map((resp, idx) => (
            <li key={resp._id.toString()} role="option" aria-selected={idx === activeIndex}>
              <button
                ref={(el) => {
                  itemRefs.current[idx] = el;
                }}
                onClick={() => onSelect(applyMergeTags(resp.body, context))}
                onMouseEnter={() => setActiveIndex(idx)}
                className={`w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors ${
                  idx === activeIndex ? "bg-blue-50" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-800 truncate">{resp.title}</span>
                  <span className="shrink-0 text-xs font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                    /{resp.shortcut}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                  {applyMergeTags(resp.body, context)}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
