import { cn } from "../lib/utils";

export function FloatingMenu() {
  return (
    <button
      className={cn(
        "fixed top-6 right-6 z-50",
        "glass glass-hover rounded-full p-4",
        "flex items-center justify-center",
        "w-14 h-14"
      )}
      aria-label="Menu"
    >
      <div className="flex flex-col gap-1.5">
        <div className="w-5 h-0.5 bg-primary rounded-full"></div>
        <div className="w-5 h-0.5 bg-primary rounded-full"></div>
        <div className="w-5 h-0.5 bg-primary rounded-full"></div>
      </div>
    </button>
  );
}
