import { useState } from "react";

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
    <div className="glass rounded-2xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Chevron */}
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${
              isExpanded ? "rotate-90" : ""
            }`}
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
      {isExpanded && <div className="px-6 pb-4">{children}</div>}
    </div>
  );
}
