import { useState } from "react";
import { cn } from "../lib/utils";

interface ExpandableSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  itemCount?: number;
}

export function ExpandableSection({
  title,
  children,
  defaultExpanded = false,
  itemCount,
}: ExpandableSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="glass rounded-2xl">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/30 transition-colors rounded-t-2xl"
      >
        <div className="flex items-center gap-3">
          {/* Chevron */}
          <svg
            className={cn(
              "w-5 h-5 text-gray-500 transition-transform duration-300 ease-out",
              isExpanded && "rotate-90"
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          <span className="font-medium text-gray-800">{title}</span>
          {itemCount !== undefined && (
            <span className="text-sm text-gray-500">
              ({itemCount} {itemCount === 1 ? "item" : "items"})
            </span>
          )}
        </div>
      </button>
      {/* Animated content container using CSS grid for smooth height transition */}
      <div
        className={cn(
          "grid transition-all duration-300 ease-out",
          isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          {/* Padding with extra top space to prevent shadow clipping on nested glass elements */}
          <div className="px-8 pt-6 pb-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
