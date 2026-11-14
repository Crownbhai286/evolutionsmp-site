"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Calendar, Clock, Tag, X } from "lucide-react";
import { NewsPost } from "@/lib/types";
import { getPlayerAvatar } from "@/lib/utils";

function sanitizeArticleHtml(raw: string): string {
  return raw
    .replace(/<\s*(script|iframe|object|embed|style|link|meta)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|iframe|object|embed|link|meta)[^>]*\/?>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');
}

export default function NewsClient({ posts }: { posts: NewsPost[] }) {
  const [selectedPost, setSelectedPost] = useState<NewsPost | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const categories = ["All", ...Array.from(new Set(posts.map((p) => p.category)))];
  const filteredPosts =
    activeCategory === "All" ? posts : posts.filter((p) => p.category === activeCategory);

  return (
    <div className="pt-28 pb-24 px-5 max-w-[1200px] mx-auto min-h-screen">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="kicker">Updates</span>
        <h1 className="font-head text-[clamp(36px,5vw,56px)] text-white tracking-wide uppercase mb-3">
          News &amp; Announcements
        </h1>
        <p className="text-[#a3abd6] text-sm sm:text-base leading-relaxed">
          Weekly patch notes, clan tournaments, season reset logs, and major network announcements from
          the EvolutionSMP team.
        </p>

        {categories.length > 2 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  activeCategory === cat
                    ? "bg-[#ff9a1f] text-[#0a0d22] shadow-md shadow-[#ff9a1f]/20"
                    : "bg-[#141a42] text-[#a3abd6] hover:text-white border border-white/[0.08]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid of articles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {filteredPosts.map((post) => (
          <article
            key={post.id}
            onClick={() => setSelectedPost(post)}
            className="group cursor-pointer rounded-[18px] bg-gradient-to-b from-[#1b2254] to-[#141a42] border border-[rgba(130,150,255,0.2)] overflow-hidden flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:border-[#ff9a1f]/60"
          >
            <div className="relative h-44 w-full">
              <Image
                src={post.coverImage || "/images/news-banner.jpg"}
                alt={post.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0d22] via-transparent to-transparent" />
              <div className="absolute top-3 left-3">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#ff9a1f] text-[#0a0d22]">
                  {post.category}
                </span>
              </div>
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 text-xs text-[#a3abd6] mb-2 font-mono">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    <span>{post.date}</span>
                  </span>
                  {post.readTime && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{post.readTime}</span>
                    </span>
                  )}
                </div>

                <h3 className="font-head text-xl text-white group-hover:text-[#ff9a1f] transition-colors leading-snug mb-2">
                  {post.title}
                </h3>

                <p className="text-xs text-[#a3abd6] line-clamp-3 leading-relaxed">
                  {post.excerpt}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <img
                    src={getPlayerAvatar(post.authorSkin, 24)}
                    alt={post.author}
                    className="h-6 w-6 rounded bg-[#0a0d22] image-rendering-pixelated"
                  />
                  <span className="font-bold text-white">{post.author}</span>
                </div>
                <span className="font-bold text-[#ff9a1f]">Read more &rarr;</span>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Article Modal */}
      {selectedPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="relative w-full max-w-2xl rounded-[24px] bg-[#0f1433] border border-[rgba(130,150,255,0.3)] shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedPost(null)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-[#141a42] text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <span className="kicker mb-2">{selectedPost.category}</span>
            <h2 className="font-head text-3xl text-white leading-tight mb-4">
              {selectedPost.title}
            </h2>

            <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-white/[0.08] flex-wrap">
              <div className="flex items-center gap-3">
                <img
                  src={getPlayerAvatar(selectedPost.authorSkin, 36)}
                  alt={selectedPost.author}
                  className="h-9 w-9 rounded-lg bg-[#0a0d22] image-rendering-pixelated"
                />
                <div>
                  <span className="font-bold text-white block text-sm">{selectedPost.author}</span>
                  <span className="text-xs text-[#ff9a1f]">{selectedPost.authorRole}</span>
                </div>
              </div>
              <div className="text-xs font-mono text-[#a3abd6] flex items-center gap-3">
                <span>{selectedPost.date}</span>
                {selectedPost.readTime && <span>&bull; {selectedPost.readTime}</span>}
              </div>
            </div>

            {selectedPost.contentHtml?.trim() ? (
              <div
                className="space-y-4 text-sm text-[#c7ccf0] leading-relaxed mb-6 [&_h2]:font-head [&_h2]:text-xl [&_h2]:text-white [&_h3]:font-head [&_h3]:text-lg [&_h3]:text-white [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-[#ff9a1f] [&_a]:underline [&_strong]:text-white"
                dangerouslySetInnerHTML={{
                  __html: sanitizeArticleHtml(selectedPost.contentHtml),
                }}
              />
            ) : (
              <div className="space-y-4 text-sm text-[#a3abd6] leading-relaxed mb-6">
                {selectedPost.content.map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
              </div>
            )}

            {selectedPost.tags && selectedPost.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-5">
                <Tag className="h-3.5 w-3.5 text-[#a3abd6]" />
                {selectedPost.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-lg bg-[#141a42] border border-white/[0.08] text-[11px] font-bold text-[#c7ccf0]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-white/[0.08] text-right">
              <button
                onClick={() => setSelectedPost(null)}
                className="btn small text-xs"
              >
                Close Article
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
