import { FloatingLogo } from "./components/FloatingLogo";
import { FloatingMenu } from "./components/FloatingMenu";
import { MaterialCard } from "./components/MaterialCard";
import { AddMaterialCard } from "./components/AddMaterialCard";
import { ToolCard } from "./components/ToolCard";

function App() {
  const materials = [
    {
      name: "NiSi",
      formula: "NiSi",
      lastModified: "2 days ago",
    },
    {
      name: "Silver Cobaltate",
      formula: "AgCoO<sub>2</sub>",
      lastModified: "1 week ago",
    },
    {
      name: "Lanthanum Antimonide",
      formula: "LaSb",
      lastModified: "3 weeks ago",
    },
  ];

  const tools = [
    {
      name: "Brillouin Zone Viewer",
      description: "Visualize Brillouin zones in reciprocal space with high-symmetry points",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      name: "Fermi Surface Viewer",
      description: "Interactive 3D visualization of Fermi surfaces and electronic states",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: "Band Structure Plotter",
      description: "Plot electronic band structures along high-symmetry k-point paths",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      ),
    },
    {
      name: "DOS Plotter",
      description: "Generate density of states plots with customizable energy ranges",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen w-full overflow-auto">
      <FloatingLogo />
      <FloatingMenu />

      <main className="container mx-auto px-8 pt-32 pb-16">
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 font-kadwa">
            Projects
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AddMaterialCard />
            {materials.map((material, index) => (
              <MaterialCard
                key={index}
                name={material.name}
                formula={material.formula}
                lastModified={material.lastModified}
              />
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 font-kadwa">
            Analysis Tools
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {tools.map((tool, index) => (
              <ToolCard
                key={index}
                name={tool.name}
                description={tool.description}
                icon={tool.icon}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
