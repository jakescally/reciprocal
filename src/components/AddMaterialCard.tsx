import { cn } from "../lib/utils";

interface AddMaterialCardProps {
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function AddMaterialCard({ onClick, onMouseEnter, onMouseLeave }: AddMaterialCardProps) {
  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "rounded-2xl p-6",
        "border-2 border-dashed border-primary/40",
        "cursor-pointer select-none",
        "w-[280px] h-[180px] flex flex-col items-center justify-center",
        "bg-white/20 backdrop-blur-xl",
        "hover:border-primary/60 hover:bg-white/30",
        "transition-all duration-200 ease-out",
        "hover:-translate-y-1",
        "active:scale-95 active:translate-y-0"
      )}
    >
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 transition-transform duration-200 group-active:scale-90">
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
      <p className="text-primary font-medium">New Project</p>
    </div>
  );
}
