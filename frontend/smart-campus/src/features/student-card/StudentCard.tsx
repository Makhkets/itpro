import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { User } from "@/shared/api/types";
import { ROLE_LABEL } from "@/shared/lib/role";

interface StudentCardProps {
  user: User;
  open: boolean;
  onClose: () => void;
}

function generateBarcode(id: string): string[] {
  const hash = id.replace(/-/g, "").slice(0, 20);
  const bars: string[] = [];
  for (let i = 0; i < hash.length; i++) {
    const code = hash.charCodeAt(i);
    bars.push(code % 3 === 0 ? "w" : code % 3 === 1 ? "n" : "m");
  }
  return bars;
}

function Barcode({ id }: { id: string }) {
  const bars = useMemo(() => generateBarcode(id), [id]);
  return (
    <div className="flex items-end justify-center gap-[1px] h-12">
      {bars.map((b, i) => (
        <div
          key={i}
          className="bg-white rounded-[0.5px]"
          style={{
            width: b === "w" ? 3 : b === "m" ? 2 : 1,
            height: b === "w" ? "100%" : b === "m" ? "85%" : "70%",
          }}
        />
      ))}
    </div>
  );
}

function MagStripe() {
  return (
    <div className="w-full space-y-1">
      <div className="h-8 bg-[#1a1a2e] rounded-sm" />
      <div className="h-5 bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 rounded-sm" />
    </div>
  );
}

export function StudentCard({ user, open, onClose }: StudentCardProps) {
  const [flipped, setFlipped] = useState(false);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" />

      <div
        className="relative z-10 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/70 hover:text-white transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        <div
          className="relative cursor-pointer"
          style={{ perspective: "1000px" }}
          onClick={() => setFlipped(!flipped)}
        >
          <div
            className="relative w-full transition-transform duration-700"
            style={{
              transformStyle: "preserve-3d",
              transform: flipped ? "rotateY(180deg)" : "rotateY(0)",
            }}
          >
            {/* ---- FRONT ---- */}
            <div
              className="w-full rounded-2xl overflow-hidden shadow-2xl"
              style={{ backfaceVisibility: "hidden" }}
            >
              <div
                className="relative p-6 pb-8"
                style={{
                  background: "linear-gradient(145deg, #7B1E2E 0%, #5A1520 50%, #2D0A10 100%)",
                  height: 260,
                  overflow: "hidden",
                }}
              >
                {/* Decorative pattern */}
                <div className="absolute inset-0 opacity-[0.06]">
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 11px)",
                    }}
                  />
                </div>

                {/* Top row: logo + university name */}
                <div className="relative flex items-center gap-3 mb-6">
                  <div className="h-12 w-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center p-1.5 border border-white/10">
                    <img
                      src="/ggntu.ico"
                      alt="ГГНТУ"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-medium">
                      Грозненский государственный
                    </div>
                    <div className="text-xs uppercase tracking-[0.15em] text-white/90 font-semibold">
                      Нефтяной технический университет
                    </div>
                    <div className="text-[9px] uppercase tracking-[0.2em] text-white/40 mt-0.5">
                      им. акад. М.Д. Миллионщикова
                    </div>
                  </div>
                </div>

                {/* Student ID label */}
                <div className="relative mb-4">
                  <div className="inline-block px-3 py-1 rounded-lg bg-white/10 border border-white/10">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/70 font-semibold">
                      Student ID Card
                    </span>
                  </div>
                </div>

                {/* User info */}
                <div className="relative">
                  <div className="text-lg font-semibold text-white tracking-wide">
                    {user.fullName.toUpperCase()}
                  </div>
                  <div className="text-xs text-white/60 mt-1.5">
                    {ROLE_LABEL[user.role]}
                    {user.groupName ? ` · ${user.groupName}` : ""}
                  </div>
                  {user.department && (
                    <div className="text-[11px] text-white/45 mt-0.5">
                      {user.department}
                    </div>
                  )}
                </div>

                {/* SmartCampus watermark */}
                <div className="absolute bottom-2 right-4 text-[8px] uppercase tracking-[0.3em] text-white/15 font-medium">
                  SmartCampus
                </div>
              </div>
            </div>

            {/* ---- BACK ---- */}
            <div
              className="w-full rounded-2xl overflow-hidden shadow-2xl absolute top-0 left-0"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
              }}
            >
              <div
                className="relative p-6 overflow-hidden"
                style={{
                  background: "linear-gradient(145deg, #7B1E2E 0%, #5A1520 50%, #2D0A10 100%)",
                  height: 260,
                }}
              >
                {/* Same decorative pattern as front */}
                <div className="absolute inset-0 opacity-[0.06]">
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 11px)",
                    }}
                  />
                </div>

                {/* Barcode */}
                <div className="relative bg-white/8 border border-white/10 rounded-xl p-3 mb-4">
                  <Barcode id={user.id} />
                  <div className="text-center mt-1.5 font-mono text-[8px] tracking-[0.2em] text-white/40">
                    {user.id.slice(0, 8).toUpperCase()}
                  </div>
                </div>

                {/* Info block */}
                <div className="relative space-y-2">
                  <InfoLine label="Факультет" value={user.department ?? "—"} />
                  <InfoLine label="Группа" value={user.groupName ?? "—"} />
                  <InfoLine label="Email" value={user.email} />
                </div>

                {/* Bottom: logo + watermark */}
                <div className="absolute bottom-3 left-6 right-6 flex items-center justify-between">
                  <div className="h-7 w-7 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center p-1">
                    <img
                      src="/ggntu.ico"
                      alt="ГГНТУ"
                      className="h-full w-full object-contain opacity-50"
                    />
                  </div>
                  <div className="text-[7px] uppercase tracking-[0.25em] text-white/15 font-medium">
                    SmartCampus
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-white/50 mt-4">
          Нажмите на карту, чтобы перевернуть
        </p>
      </div>
    </div>,
    document.body,
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] uppercase tracking-wider text-white/40">
        {label}
      </span>
      <span className="text-[11px] text-white/80 font-medium truncate max-w-[55%] text-right">
        {value}
      </span>
    </div>
  );
}
