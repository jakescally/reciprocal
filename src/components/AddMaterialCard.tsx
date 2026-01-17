import { cn } from "../lib/utils";

export function AddMaterialCard() {
  return (
    <div
      className={cn(
        "rounded-2xl p-6 glass-hover",
        "border-2 border-dashed border-primary/40",
        "cursor-pointer select-none",
        "min-h-[180px] flex flex-col items-center justify-center",
        "bg-white/40 backdrop-blur-sm",
        "hover:border-primary/60 hover:bg-white/50"
      )}
    >
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
        <svg
          className="w-6 h-6 text-primary"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <p className="text-primary font-medium">New Material</p>
    </div>
  );
}
