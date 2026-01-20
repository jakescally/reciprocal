import { cn } from "../lib/utils";

interface MiniAppCardProps {
  name: string;
  description: string;
  icon: React.ReactNode;
  hasData?: boolean;
  onClick?: () => void;
}

export function MiniAppCard({
  name,
  description,
  icon,
  hasData = false,
  onClick,
}: MiniAppCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "glass glass-hover rounded-2xl p-6",
        "cursor-pointer select-none",
        "w-[280px] h-[180px] flex flex-col",
        "transition-all duration-200"
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            hasData ? "bg-primary/10" : "bg-gray-200/50"
          )}
        >
          <div className={hasData ? "text-primary" : "text-gray-400"}>
            {icon}
          </div>
        </div>
        <span
          className={cn(
            "text-xs px-2 py-1 rounded-full",
            hasData
              ? "text-green-600 bg-green-100/50"
              : "text-gray-400 bg-gray-200/50"
          )}
        >
          {hasData ? "Ready" : "No data"}
        </span>
      </div>

      <div className="flex-1">
        <h3
          className={cn(
            "text-lg font-semibold mb-2 font-kadwa",
            hasData ? "text-primary" : "text-gray-600"
          )}
        >
          {name}
        </h3>
        <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
