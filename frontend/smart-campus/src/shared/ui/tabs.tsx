import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/shared/lib/cn";

export interface TabItem {
  key: string;
  label: ReactNode;
  count?: number;
}

export function Tabs({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem[];
  value?: string;
  onChange?: (key: string) => void;
  className?: string;
}) {
  const [internal, setInternal] = useState(items[0]?.key);
  const active = value ?? internal;
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 p-1 bg-navy/5 rounded-xl",
        className,
      )}
    >
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <button
            key={item.key}
            onClick={() => {
              onChange?.(item.key);
              setInternal(item.key);
            }}
            className={cn(
              "relative px-4 h-9 rounded-lg text-sm font-medium transition-colors",
              isActive ? "text-white" : "text-navy-75 hover:text-navy",
            )}
          >
            {isActive && (
              <motion.span
                layoutId="tab-pill"
                className="absolute inset-0 bg-navy rounded-lg"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative inline-flex items-center gap-2">
              {item.label}
              {typeof item.count === "number" && (
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full",
                    isActive ? "bg-white/15" : "bg-navy/10",
                  )}
                >
                  {item.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
