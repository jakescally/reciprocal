import { cn } from "../lib/utils";

interface MaterialCardProps {
  name: string;
  formula: string;
  lastOpened?: string;
  isNew?: boolean;
  onClick?: () => void;
}

export function MaterialCard({ name, formula, lastOpened = "2 days ago", isNew = false, onClick }: MaterialCardProps) {
  return (
    <div
      onClick={onClick}
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
          Opened {lastOpened}
        </p>
      </div>
    </div>
  );
}
