import { useRef } from "react";
import { cn } from "../lib/utils";

export interface CardRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface MaterialCardProps {
  name: string;
  formula: string;
  lastModified?: string;
  isNew?: boolean;
  onClick?: (rect: CardRect) => void;
}

export function MaterialCard({ name, formula, lastModified = "2 days ago", isNew = false, onClick }: MaterialCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleClick = () => {
    if (onClick && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      onClick({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    }
  };

  return (
    <div
      ref={cardRef}
      onClick={handleClick}
      className={cn(
        "glass glass-hover rounded-2xl p-6",
        "cursor-pointer select-none",
        "w-[280px] h-[180px] flex flex-col justify-between",
        isNew && "animate-card-new"
      )}
    >
      <div>
        <h3 className="text-xl font-semibold text-primary mb-2 font-kadwa">
          {name}
        </h3>
        <p
          className="text-2xl text-gray-700 font-light"
          dangerouslySetInnerHTML={{ __html: formula }}
        />
      </div>
      <div className="mt-4">
        <p className="text-sm text-gray-500">
          Modified {lastModified}
        </p>
      </div>
    </div>
  );
}
