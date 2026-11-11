"use client";

import React, { useState } from "react";
import { ChevronRight, Copy, Check } from "lucide-react";
import { SERVER_CONFIG } from "@/lib/data";
import { copyToClipboard } from "@/lib/utils";
import { useToast } from "./NotificationToast";
import { ScrollReveal, StaggerReveal, StaggerItem } from "./ScrollReveal";

export default function HowToJoinSection() {
  const [copiedJava, setCopiedJava] = useState(false);
  const [copiedBedrock, setCopiedBedrock] = useState(false);
  const { showToast } = useToast();

  const handleCopy = async (text: string, type: "java" | "bedrock") => {
    const ok = await copyToClipboard(text);
    if (ok) {
      if (type === "java") {
        setCopiedJava(true);
        setTimeout(() => setCopiedJava(false), 2000);
      } else {
        setCopiedBedrock(true);
        setTimeout(() => setCopiedBedrock(false), 2000);
      }
      showToast("IP Copied!", `${text} copied to your clipboard.`, "success");
    }
  };

  return (
    <section id="join" className="py-20 px-5 relative">
      <div className="max-w-[1200px] mx-auto">
        {/* Section Header */}
        <ScrollReveal direction="up" duration={0.65} className="text-center max-w-2xl mx-auto mb-14">
          <span className="kicker">Get Started</span>
          <h2 className="font-head text-[clamp(32px,4.5vw,52px)] text-white tracking-wide uppercase mb-3">
            How to Join
          </h2>
          <p className="text-[#a3abd6] text-base leading-relaxed">
            Joining Evolution Survival SMP takes less than 30 seconds. Connect from any Java or Bedrock device.
          </p>
        </ScrollReveal>

        {/* Playbex 3-Step Row with Chevron Connectors & Progressive Staggered Scroll Reveal */}
        <StaggerReveal staggerDelay={0.12} className="grid grid-cols-1 md:grid-cols-3 gap-5 relative">
          {/* Step 1 */}
          <StaggerItem distance={26} className="h-full">
            <div className="relative h-full rounded-[18px] p-8 sm:p-9 bg-gradient-to-b from-[#1b2254] to-[#141a42] border border-[rgba(130,150,255,0.24)] shadow-xl flex flex-col justify-between hover:border-[#ff9a1f]/60 hover:shadow-2xl hover:shadow-[#ff9a1f]/10 hover:-translate-y-1 transition-all duration-300">
              <div>
                <div className="h-[46px] w-[46px] rounded-full bg-gradient-to-br from-[#ffb02e] via-[#ff7a1f] to-[#ff3d5a] flex items-center justify-center font-head text-[22px] text-white shadow-lg shadow-[#ff3d5a]/30 mb-6">
                  1
                </div>
                <h3 className="font-head text-2xl text-white tracking-wide mb-2">
                  Launch Minecraft
                </h3>
                <p className="text-sm text-[#a3abd6] leading-relaxed">
                  Java or Bedrock, version 1.20 to 1.21+. Seamless crossplay on PC, Console, iOS, and Android.
                </p>
              </div>

              <ChevronRight className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 text-[rgba(130,150,255,0.4)] z-10" />
            </div>
          </StaggerItem>

          {/* Step 2 */}
          <StaggerItem distance={26} className="h-full">
            <div className="relative h-full rounded-[18px] p-8 sm:p-9 bg-gradient-to-b from-[#1b2254] to-[#141a42] border border-[rgba(130,150,255,0.24)] shadow-xl flex flex-col justify-between hover:border-[#ff9a1f]/60 hover:shadow-2xl hover:shadow-[#ff9a1f]/10 hover:-translate-y-1 transition-all duration-300">
              <div>
                <div className="h-[46px] w-[46px] rounded-full bg-gradient-to-br from-[#ffb02e] via-[#ff7a1f] to-[#ff3d5a] flex items-center justify-center font-head text-[22px] text-white shadow-lg shadow-[#ff3d5a]/30 mb-6">
                  2
                </div>
                <h3 className="font-head text-2xl text-white tracking-wide mb-2">
                  Add the Server
                </h3>
                <p className="text-sm text-[#a3abd6] leading-relaxed">
                  Enter Java IP:{" "}
                  <button
                    type="button"
                    onClick={() => handleCopy(SERVER_CONFIG.javaIp, "java")}
                    className="inline-flex items-center gap-1 font-mono font-bold text-[#ffc23d] bg-black/40 px-2 py-0.5 rounded border border-white/[0.08] hover:border-[#ff9a1f] transition-all"
                  >
                    <span>{SERVER_CONFIG.javaIp}</span>
                    {copiedJava ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3 text-[#a3abd6]" />}
                  </button>
                  <br />
                  Bedrock:{" "}
                  <button
                    type="button"
                    onClick={() => handleCopy(SERVER_CONFIG.bedrockIp, "bedrock")}
                    className="inline-flex items-center gap-1 font-mono font-bold text-[#3aa0ff] bg-black/40 px-2 py-0.5 rounded border border-white/[0.08] hover:border-[#3aa0ff] transition-all mt-1"
                  >
                    <span>{SERVER_CONFIG.bedrockIp}</span>
                    {copiedBedrock ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3 text-[#a3abd6]" />}
                  </button>{" "}
                  port <code className="font-mono text-white bg-black/40 px-1.5 py-0.5 rounded">{SERVER_CONFIG.bedrockPort}</code>
                </p>
              </div>

              <ChevronRight className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 text-[rgba(130,150,255,0.4)] z-10" />
            </div>
          </StaggerItem>

          {/* Step 3 */}
          <StaggerItem distance={26} className="h-full">
            <div className="relative h-full rounded-[18px] p-8 sm:p-9 bg-gradient-to-b from-[#1b2254] to-[#141a42] border border-[rgba(130,150,255,0.24)] shadow-xl flex flex-col justify-between hover:border-[#ff9a1f]/60 hover:shadow-2xl hover:shadow-[#ff9a1f]/10 hover:-translate-y-1 transition-all duration-300">
              <div>
                <div className="h-[46px] w-[46px] rounded-full bg-gradient-to-br from-[#ffb02e] via-[#ff7a1f] to-[#ff3d5a] flex items-center justify-center font-head text-[22px] text-white shadow-lg shadow-[#ff3d5a]/30 mb-6">
                  3
                </div>
                <h3 className="font-head text-2xl text-white tracking-wide mb-2">
                  Begin Your Survival
                </h3>
                <p className="text-sm text-[#a3abd6] leading-relaxed">
                  Join the Survival world, claim your grief-free territory, establish your chest shops, and build with the community.
                </p>
              </div>
            </div>
          </StaggerItem>
        </StaggerReveal>
      </div>
    </section>
  );
}
