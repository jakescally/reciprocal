import { cn } from "../lib/utils";

export function FloatingLogo() {
  return (
    <div className={cn(
      "fixed top-6 left-6 z-50",
      "glass rounded-full px-6 py-3",
      "transition-all duration-300 hover:shadow-lg"
    )}>
      <h1 className="text-2xl font-bold font-kadwa text-primary">
        Reciproca/
      </h1>
    </div>
  );
}
