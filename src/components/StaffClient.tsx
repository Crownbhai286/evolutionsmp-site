"use client";

import React from "react";
import { ExternalLink } from "lucide-react";
import { StaffMember } from "@/lib/types";
import { getPlayerAvatar, copyToClipboard } from "@/lib/utils";
import { useToast } from "@/components/NotificationToast";

export default function StaffClient({
  members,
  discordInviteUrl,
}: {
  members: StaffMember[];
  discordInviteUrl: string;
}) {
  const { showToast } = useToast();

  const handleCopyDiscord = async (discord: string) => {
    const ok = await copyToClipboard(discord);
    if (ok) {
      showToast("Discord copied", `${discord} copied to clipboard.`, "info");
    }
  };

  return (
    <div className="pt-28 pb-24 px-5 max-w-[1200px] mx-auto min-h-screen">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="kicker">Official Team</span>
        <h1 className="font-head text-[clamp(36px,5vw,56px)] text-white tracking-wide uppercase mb-3">
          EvolutionSMP Staff
        </h1>
        <p className="text-[#a3abd6] text-sm sm:text-base leading-relaxed">
          The administrators, developers, and moderators dedicated to keeping the server
          cheat-free, balanced, and optimized.
        </p>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
        {members.map((staff) => {
          const skinOrUrl = staff.skinName || staff.name;
          const isCustomAvatar =
            skinOrUrl.startsWith("http://") ||
            skinOrUrl.startsWith("https://") ||
            skinOrUrl.startsWith("/");
          const avatarSrc = isCustomAvatar
            ? skinOrUrl
            : getPlayerAvatar(skinOrUrl, 64);

          return (
            <div
              key={staff.id}
              className="rounded-[18px] p-6 bg-gradient-to-b from-[#1b2254] to-[#141a42] border border-[rgba(130,150,255,0.2)] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-16 w-16 rounded-2xl bg-[#0a0d22] border border-white/[0.08] p-1 flex items-center justify-center overflow-hidden">
                    <img
                      src={avatarSrc}
                      alt={staff.name}
                      className="h-14 w-14 object-contain image-rendering-pixelated rounded-xl"
                    />
                  </div>
                  <div>
                    <h3 className="font-head text-2xl text-white tracking-wide">
                      {staff.name}
                    </h3>
                    <span
                      className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-white/[0.08] border border-white/[0.08]"
                      style={{ color: staff.roleColor || "#ff9a1f" }}
                    >
                      {staff.role}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#a3abd6] leading-relaxed mb-4">{staff.bio}</p>

                {staff.responsibilities && staff.responsibilities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {staff.responsibilities.map((resp) => (
                      <span
                        key={resp}
                        className="px-2 py-0.5 rounded bg-white/[0.05] text-[10px] font-semibold text-[#c7ccf0] border border-white/[0.06]"
                      >
                        {resp}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs">
                <span className="text-[#6f78a8] text-[11px] font-mono">Since {staff.joinedDate}</span>
                <button
                  type="button"
                  onClick={() => handleCopyDiscord(staff.discord)}
                  className="font-mono text-white text-[11px] hover:text-[#ff9a1f] transition-colors"
                  title="Copy Discord"
                >
                  {staff.discord}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Staff Application CTA */}
      <div className="rounded-[22px] p-8 sm:p-10 bg-gradient-to-b from-[#1b2254] to-[#141a42] border border-[rgba(130,150,255,0.24)] flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="font-head text-2xl text-white uppercase tracking-wide">
            Want to join the Staff team?
          </h2>
          <p className="text-xs text-[#a3abd6] mt-1 max-w-xl">
            We are always seeking mature and active players for moderation and community support. Submit your
            application on our Discord.
          </p>
        </div>

        <a
          href={discordInviteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn glass shrink-0"
        >
          <span>Apply on Discord</span>
          <ExternalLink className="h-4 w-4 text-[#ff9a1f]" />
        </a>
      </div>
    </div>
  );
}
