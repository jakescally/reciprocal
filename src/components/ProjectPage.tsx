import { Project, formatRelativeTime } from "../lib/projects";
import { MiniAppCard } from "./MiniAppCard";

interface ProjectPageProps {
  project: Project;
}

export function ProjectPage({ project }: ProjectPageProps) {
  // Placeholder lattice parameters (will come from CIF file later)
  const latticeParams = {
    a: "2.8665",
    b: "2.8665",
    c: "2.8665",
    alpha: "90.00",
    beta: "90.00",
    gamma: "90.00",
    spaceGroup: "Fm-3m",
    volume: "23.55",
  };

  const miniApps = [
    {
      id: "band-structure",
      name: "Band Structure",
      description: "Electronic band structure along high-symmetry paths",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
          />
        </svg>
      ),
    },
    {
      id: "dos",
      name: "Density of States",
      description: "Electronic density of states visualization",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="h-screen w-full overflow-hidden flex flex-col">
      <main className="flex-1 overflow-y-auto pt-28 px-8">
        <div className="max-w-[1600px] mx-auto">
          {/* Header Section */}
          <div className="glass rounded-3xl p-8">
            <div className="flex gap-12">
              {/* Left Side - Project Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-4xl font-bold text-gray-800 font-kadwa mb-2">
                  {project.name}
                </h1>
                <p
                  className="text-2xl text-gray-600 mb-6"
                  dangerouslySetInnerHTML={{ __html: project.formula }}
                />

                <div className="text-sm text-gray-500 mb-8">
                  Created {formatRelativeTime(project.created_at)} · Last
                  modified {formatRelativeTime(project.updated_at)}
                </div>

                {/* Lattice Parameters */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                  <div className="text-sm">
                    <span className="text-gray-500">Space Group:</span>{" "}
                    <span className="text-gray-800 font-medium">
                      {latticeParams.spaceGroup}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">Volume:</span>{" "}
                    <span className="text-gray-800 font-medium">
                      {latticeParams.volume} A³
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">a:</span>{" "}
                    <span className="text-gray-800 font-medium">
                      {latticeParams.a} A
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">α:</span>{" "}
                    <span className="text-gray-800 font-medium">
                      {latticeParams.alpha}°
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">b:</span>{" "}
                    <span className="text-gray-800 font-medium">
                      {latticeParams.b} A
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">β:</span>{" "}
                    <span className="text-gray-800 font-medium">
                      {latticeParams.beta}°
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">c:</span>{" "}
                    <span className="text-gray-800 font-medium">
                      {latticeParams.c} A
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">γ:</span>{" "}
                    <span className="text-gray-800 font-medium">
                      {latticeParams.gamma}°
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Side - 3D Model Placeholder */}
              <div className="w-[350px] h-[280px] flex-shrink-0">
                <div className="w-full h-full bg-black rounded-2xl flex items-center justify-center">
                  <span className="text-gray-600 text-sm">
                    Unit Cell Preview
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Mini Apps Section */}
          <div className="py-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 font-kadwa">
              Analysis Tools
            </h2>

            <div className="flex gap-6 flex-wrap">
              {miniApps.map((app) => (
                <MiniAppCard
                  key={app.id}
                  name={app.name}
                  description={app.description}
                  icon={app.icon}
                  hasData={false}
                  onClick={() => {
                    // TODO: Open mini-app
                    console.log(`Opening ${app.id}`);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
