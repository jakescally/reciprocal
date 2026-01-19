import { useEffect, useState } from "react";
import { Project } from "../lib/projects";
import { CardRect } from "./MaterialCard";

interface ProjectTransitionProps {
  project: Project;
  startRect: CardRect;
  onAnimationComplete: () => void;
}

export function ProjectTransition({
  project,
  startRect,
  onAnimationComplete,
}: ProjectTransitionProps) {
  const [phase, setPhase] = useState<"start" | "expand">("start");

  // Target position for the header (matches ProjectPage header positioning)
  const targetRect = {
    top: 112, // pt-28 = 7rem = 112px
    left: 32, // px-8 = 2rem = 32px
    width: Math.min(window.innerWidth - 64, 1600), // max-w-[1600px] with px-8 on each side
    height: 340, // approximate header height
  };

  useEffect(() => {
    // Start the expansion after a brief moment
    const expandTimer = setTimeout(() => {
      setPhase("expand");
    }, 50);

    // Complete the animation
    const completeTimer = setTimeout(() => {
      onAnimationComplete();
    }, 500);

    return () => {
      clearTimeout(expandTimer);
      clearTimeout(completeTimer);
    };
  }, [onAnimationComplete]);

  const currentRect = phase === "start" ? startRect : targetRect;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Backdrop fade */}
      <div
        className="absolute inset-0 bg-black/10 transition-opacity duration-500"
        style={{ opacity: phase === "expand" ? 1 : 0 }}
      />

      {/* Expanding card */}
      <div
        className="absolute glass rounded-3xl p-8 transition-all duration-500 ease-out overflow-hidden"
        style={{
          top: currentRect.top,
          left: currentRect.left,
          width: currentRect.width,
          height: currentRect.height,
        }}
      >
        {/* Card content that morphs into header content */}
        <div
          className="transition-opacity duration-300"
          style={{ opacity: phase === "expand" ? 1 : 0.8 }}
        >
          <h1 className="text-4xl font-bold text-gray-800 font-kadwa mb-2">
            {project.name}
          </h1>
          <p
            className="text-2xl text-gray-600"
            dangerouslySetInnerHTML={{ __html: project.formula }}
          />
        </div>
      </div>
    </div>
  );
}
