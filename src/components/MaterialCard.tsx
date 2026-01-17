import { cn } from "../lib/utils";

interface MaterialCardProps {
  name: string;
  formula: string;
  lastModified?: string;
}

export function MaterialCard({ name, formula, lastModified = "2 days ago" }: MaterialCardProps) {
  return (
    <div
      className={cn(
        "glass glass-hover rounded-2xl p-6",
        "cursor-pointer select-none",
        "w-[280px] h-[180px] flex flex-col justify-between"
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
