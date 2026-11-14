"use client";

import React, { useState } from "react";
import { Search, ExternalLink } from "lucide-react";
import type { RuleSection } from "@/lib/types";

export default function RulesClient({
  sections,
  discordTicketUrl,
}: {
  sections: RuleSection[];
  discordTicketUrl: string;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("ALL");

  const filteredSections = sections
    .map((section) => {
      const matchingRules = section.rules.filter((rule) => {
        const q = searchQuery.toLowerCase();
        return (
          rule.title.toLowerCase().includes(q) ||
          rule.description.toLowerCase().includes(q) ||
          rule.number.includes(searchQuery)
        );
      });

      return {
        ...section,
        rules: matchingRules,
      };
    })
    .filter((section) => {
      if (activeCategory !== "ALL" && section.id !== activeCategory) return false;
      return section.rules.length > 0;
    });

  return (
    <div className="pt-28 pb-24 px-5 max-w-[1200px] mx-auto min-h-screen">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="kicker">Guidelines</span>
        <h1 className="font-head text-[clamp(36px,5vw,56px)] text-white tracking-wide uppercase mb-3">
          Server Rules
        </h1>
        <p className="text-[#a3abd6] text-sm sm:text-base leading-relaxed">
          To ensure a fair, competitive, and enjoyable survival environment on EvolutionSMP, all players
          are expected to respect and adhere to these guidelines.
        </p>

        {/* Search */}
        <div className="mt-6 max-w-md mx-auto relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a3abd6]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rules (e.g. x-ray, harassment, exploits)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#141a42] border border-white/[0.08] text-white placeholder-slate-400 text-xs focus:outline-none focus:border-[#ff9a1f]"
          />
        </div>

        {sections.length > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
            <button
              type="button"
              onClick={() => setActiveCategory("ALL")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                activeCategory === "ALL"
                  ? "bg-[#ff9a1f] text-[#0a0d22] shadow-md shadow-[#ff9a1f]/20"
                  : "bg-[#141a42] text-[#a3abd6] hover:text-white border border-white/[0.08]"
              }`}
            >
              All Categories
            </button>
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveCategory(section.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  activeCategory === section.id
                    ? "bg-[#ff9a1f] text-[#0a0d22] shadow-md shadow-[#ff9a1f]/20"
                    : "bg-[#141a42] text-[#a3abd6] hover:text-white border border-white/[0.08]"
                }`}
              >
                {section.category}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Rules Grid */}
      <div className="space-y-10">
        {filteredSections.map((section) => (
          <div key={section.id} className="space-y-4">
            <h2 className="font-head text-2xl text-white uppercase tracking-wide border-b border-white/[0.08] pb-3">
              {section.category}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {section.rules.map((rule) => (
                <div
                  key={rule.id}
                  className="rounded-[18px] p-6 bg-gradient-to-b from-[#1b2254] to-[#141a42] border border-[rgba(130,150,255,0.2)] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#ff9a1f] bg-black/40 px-2 py-0.5 rounded border border-white/[0.08]">
                          § {rule.number}
                        </span>
                        <h3 className="font-bold text-white text-base">{rule.title}</h3>
                      </div>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#ff3d5a]/20 text-[#ff3d5a] border border-[#ff3d5a]/40 shrink-0">
                        {rule.severity}
                      </span>
                    </div>

                    <p className="text-xs text-[#a3abd6] leading-relaxed mt-2">
                      {rule.description}
                    </p>

                    {rule.examples && rule.examples.length > 0 && (
                      <ul className="mt-3 space-y-1 text-[11px] text-[#c7ccf0] list-disc pl-4">
                        {rule.examples.map((ex, i) => (
                          <li key={i}>{ex}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs">
                    <span className="text-[11px] uppercase tracking-wider text-[#6f78a8] font-bold">
                      Punishment:
                    </span>
                    <span className="font-mono font-bold text-[#ffc23d] text-[11px] text-right">
                      {rule.punishment}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {filteredSections.length === 0 && (
          <div className="rounded-[18px] p-10 bg-[#141a42] border border-white/[0.08] text-center text-sm text-[#a3abd6]">
            No rules match your current filter.
          </div>
        )}
      </div>

      {/* Appeals Card */}
      <div className="mt-16 rounded-[22px] p-8 bg-gradient-to-b from-[#1b2254] to-[#141a42] border border-[rgba(130,150,255,0.24)] flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="font-head text-2xl text-white uppercase tracking-wide">
            Unfair Punishment?
          </h3>
          <p className="text-xs text-[#a3abd6] mt-1 max-w-xl">
            If you believe a sanction or ban was issued in error, you may open a ban appeal ticket on
            our official Discord with supporting evidence.
          </p>
        </div>

        <a
          href={discordTicketUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn glass shrink-0"
        >
          <span>Open Discord Ticket</span>
          <ExternalLink className="h-4 w-4 text-[#ff9a1f]" />
        </a>
      </div>
    </div>
  );
}
