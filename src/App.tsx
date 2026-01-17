import { FloatingLogo } from "./components/FloatingLogo";
import { FloatingMenu } from "./components/FloatingMenu";
import { MaterialCard } from "./components/MaterialCard";
import { AddMaterialCard } from "./components/AddMaterialCard";

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

  return (
    <div className="min-h-screen w-full overflow-auto">
      <FloatingLogo />
      <FloatingMenu />

      <main className="container mx-auto px-8 pt-32 pb-16">
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 font-kadwa">
            Materials
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
      </main>
    </div>
  );
}

export default App;
