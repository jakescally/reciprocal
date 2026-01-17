import { cn } from "../lib/utils";

interface ToolCardProps {
  name: string;
  description: string;
  icon: React.ReactNode;
}

export function ToolCard({ name, description, icon }: ToolCardProps) {
  return (
    <div
      className={cn(
        "glass glass-hover rounded-2xl p-6",
        "cursor-pointer select-none",
        "min-h-[180px] flex flex-col"
      )}
    >
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
        <div className="text-primary">
          {icon}
        </div>
      </div>

      <div className="flex-1">
        <h3 className="text-lg font-semibold text-primary mb-2 font-kadwa">
          {name}
        </h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
