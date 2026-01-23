import { useEffect, useState } from "react";
import {
  Project,
  CrystalData,
  loadCrystalData,
  listBandStructures,
  formatRelativeTime,
} from "../lib/projects";
import { cn } from "../lib/utils";
import { formatWithUncertainty } from "../lib/cifParser";
import { MiniAppCard } from "./MiniAppCard";
import { CIFUploadZone } from "./CIFUploadZone";
import { ExpandableSection } from "./ExpandableSection";
import { AtomSitesTable } from "./AtomSitesTable";
import { UnitCellViewer } from "./UnitCellViewer";

interface ProjectPageProps {
  project: Project;
  onProjectUpdate: (project: Project) => void;
  onEditProject: () => void;
  onOpenMiniApp: (miniAppId: string) => void;
}

export function ProjectPage({ project, onProjectUpdate, onEditProject, onOpenMiniApp }: ProjectPageProps) {
  const [crystalData, setCrystalData] = useState<CrystalData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasBandStructures, setHasBandStructures] = useState(false);

  // Load crystal data and check for band structures on mount or when project changes
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      // Check if band structures exist
      try {
        const bandStructures = await listBandStructures(project.id);
        setHasBandStructures(bandStructures.length > 0);
      } catch {
        setHasBandStructures(false);
      }
      try {
        if (project.has_cif) {
          const data = await loadCrystalData(project.id);
          setCrystalData(data);
        } else {
          setCrystalData(null);
        }
      } catch (error) {
        console.error("Failed to load crystal data:", error);
        setCrystalData(null);
      }
      setIsLoading(false);
    };
    loadData();
  }, [project.id, project.has_cif]);

  const handleCIFImported = (updatedProject: Project, data: CrystalData) => {
    setCrystalData(data);
    onProjectUpdate(updatedProject);
  };

  const miniApps = [
    {
      id: "brillouin-zone",
      name: "Brillouin Zone",
      description: "3D Brillouin zone with high-symmetry k-path",
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
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      ),
    },
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
    {
      id: "sirius",
      name: "SIRIUS FP-LAPW",
      description: "Guided FP-LAPW setup and ground-state calculation",
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
            d="M12 3v4m6.364.636-2.828 2.828M21 12h-4m-.636 6.364-2.828-2.828M12 21v-4m-6.364-.636 2.828-2.828M3 12h4m.636-6.364 2.828 2.828"
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
                {/* Project Name with edit icon */}
                <div
                  onClick={onEditProject}
                  className={cn(
                    "group cursor-pointer inline-flex items-center gap-3",
                    "hover:bg-white/30 rounded-lg px-2 py-1 -mx-2",
                    "transition-colors duration-200 mb-2"
                  )}
                  title="Click to edit"
                >
                  <h1 className="text-4xl font-bold text-gray-800 font-kadwa">
                    {project.name}
                  </h1>
                  <svg
                    className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </div>

                {/* Formula with edit icon */}
                <div
                  onClick={onEditProject}
                  className={cn(
                    "group cursor-pointer inline-flex items-center gap-3",
                    "hover:bg-white/30 rounded-lg px-2 py-1 -mx-2",
                    "transition-colors duration-200 mb-6"
                  )}
                  title="Click to edit"
                >
                  <p
                    className="text-2xl text-gray-600"
                    dangerouslySetInnerHTML={{ __html: project.formula }}
                  />
                  <svg
                    className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </div>

                <div className="text-sm text-gray-500 mb-8">
                  Created {formatRelativeTime(project.created_at)} · Last
                  modified {formatRelativeTime(project.updated_at)}
                </div>

                {/* Crystal Data Display */}
                {crystalData ? (
                  <div className="space-y-4">
                    {/* Primary Info Row */}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                      {crystalData.space_group_HM && (
                        <div className="text-sm">
                          <span className="text-gray-500">Space Group:</span>{" "}
                          <span className="text-gray-800 font-medium">
                            {crystalData.space_group_HM}
                            {crystalData.space_group_IT_number &&
                              ` (${crystalData.space_group_IT_number})`}
                          </span>
                        </div>
                      )}
                      {crystalData.structure_type && (
                        <div className="text-sm">
                          <span className="text-gray-500">Structure Type:</span>{" "}
                          <span className="text-gray-800 font-medium">
                            {crystalData.structure_type}
                          </span>
                        </div>
                      )}
                      {crystalData.cell_formula_units_Z && (
                        <div className="text-sm">
                          <span className="text-gray-500">Z:</span>{" "}
                          <span className="text-gray-800 font-medium">
                            {crystalData.cell_formula_units_Z}
                          </span>
                        </div>
                      )}
                      {crystalData.cell_volume && (
                        <div className="text-sm">
                          <span className="text-gray-500">Volume:</span>{" "}
                          <span className="text-gray-800 font-medium">
                            {crystalData.cell_volume.toFixed(2)} A³
                          </span>
                        </div>
                      )}
                      {crystalData.density && (
                        <div className="text-sm">
                          <span className="text-gray-500">Density:</span>{" "}
                          <span className="text-gray-800 font-medium">
                            {crystalData.density.toFixed(2)} g/cm³
                          </span>
                        </div>
                      )}
                      {crystalData.measurement_temperature && (
                        <div className="text-sm">
                          <span className="text-gray-500">Temperature:</span>{" "}
                          <span className="text-gray-800 font-medium">
                            {crystalData.measurement_temperature} K
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Lattice Parameters */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                        <div className="text-sm">
                          <span className="text-gray-500">a:</span>{" "}
                          <span className="text-gray-800 font-medium font-mono">
                            {formatWithUncertainty(
                              crystalData.cell_length_a,
                              "A"
                            )}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-500">α:</span>{" "}
                          <span className="text-gray-800 font-medium font-mono">
                            {crystalData.cell_angle_alpha.value.toFixed(2)}°
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-500">b:</span>{" "}
                          <span className="text-gray-800 font-medium font-mono">
                            {formatWithUncertainty(
                              crystalData.cell_length_b,
                              "A"
                            )}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-500">β:</span>{" "}
                          <span className="text-gray-800 font-medium font-mono">
                            {crystalData.cell_angle_beta.value.toFixed(2)}°
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-500">c:</span>{" "}
                          <span className="text-gray-800 font-medium font-mono">
                            {formatWithUncertainty(
                              crystalData.cell_length_c,
                              "A"
                            )}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-500">γ:</span>{" "}
                          <span className="text-gray-800 font-medium font-mono">
                            {crystalData.cell_angle_gamma.value.toFixed(2)}°
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : !isLoading ? (
                  <div className="text-sm text-gray-500">
                    Upload a CIF file to see crystal structure data
                  </div>
                ) : null}
              </div>

              {/* Right Side - 3D Preview or Upload Zone */}
              <div className="w-[350px] h-[280px] flex-shrink-0">
                {project.has_cif && crystalData ? (
                  <UnitCellViewer crystalData={crystalData} />
                ) : (
                  <CIFUploadZone
                    projectId={project.id}
                    onCIFImported={handleCIFImported}
                  />
                )}
              </div>
            </div>
          </div>

          {/* More Details - Nested expandable sections */}
          {crystalData && (
            <div className="mt-6">
              <ExpandableSection title="More Details">
                <div className="space-y-4">
                  {/* Atom Sites */}
                  <ExpandableSection
                    title="Atom Sites"
                    itemCount={crystalData.atom_sites.length}
                  >
                    <AtomSitesTable atoms={crystalData.atom_sites} />
                  </ExpandableSection>

                  {/* Symmetry Operations */}
                  {crystalData.symmetry_operations.length > 0 && (
                    <ExpandableSection
                      title="Symmetry Operations"
                      itemCount={crystalData.symmetry_operations.length}
                    >
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {crystalData.symmetry_operations.map((op, index) => (
                          <div
                            key={index}
                            className="text-sm font-mono text-gray-700 bg-white/50 px-3 py-1.5 rounded"
                          >
                            {op}
                          </div>
                        ))}
                      </div>
                    </ExpandableSection>
                  )}

                  {/* Anisotropic Displacement Parameters */}
                  {crystalData.anisotropic_params.length > 0 && (
                    <ExpandableSection
                      title="Anisotropic Displacement Parameters"
                      itemCount={crystalData.anisotropic_params.length}
                    >
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-2 px-2 font-medium text-gray-600">
                                Label
                              </th>
                              <th className="text-right py-2 px-2 font-medium text-gray-600">
                                β₁₁
                              </th>
                              <th className="text-right py-2 px-2 font-medium text-gray-600">
                                β₂₂
                              </th>
                              <th className="text-right py-2 px-2 font-medium text-gray-600">
                                β₃₃
                              </th>
                              <th className="text-right py-2 px-2 font-medium text-gray-600">
                                β₁₂
                              </th>
                              <th className="text-right py-2 px-2 font-medium text-gray-600">
                                β₁₃
                              </th>
                              <th className="text-right py-2 px-2 font-medium text-gray-600">
                                β₂₃
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {crystalData.anisotropic_params.map((param, index) => (
                              <tr
                                key={index}
                                className="border-b border-gray-100 hover:bg-white/50"
                              >
                                <td className="py-2 px-2 text-gray-800 font-medium">
                                  {param.label}
                                </td>
                                <td className="py-2 px-2 text-right text-gray-700 font-mono">
                                  {param.beta_11.toFixed(5)}
                                </td>
                                <td className="py-2 px-2 text-right text-gray-700 font-mono">
                                  {param.beta_22.toFixed(5)}
                                </td>
                                <td className="py-2 px-2 text-right text-gray-700 font-mono">
                                  {param.beta_33.toFixed(5)}
                                </td>
                                <td className="py-2 px-2 text-right text-gray-700 font-mono">
                                  {param.beta_12.toFixed(5)}
                                </td>
                                <td className="py-2 px-2 text-right text-gray-700 font-mono">
                                  {param.beta_13.toFixed(5)}
                                </td>
                                <td className="py-2 px-2 text-right text-gray-700 font-mono">
                                  {param.beta_23.toFixed(5)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </ExpandableSection>
                  )}

                  {/* Citation & Source - Last */}
                  {crystalData.citation && (
                    <ExpandableSection title="Citation & Source">
                      <div className="space-y-2 text-sm">
                        {crystalData.citation.title && (
                          <div>
                            <span className="text-gray-500">Title:</span>{" "}
                            <span className="text-gray-800">
                              {crystalData.citation.title}
                            </span>
                          </div>
                        )}
                        {crystalData.citation.journal && (
                          <div>
                            <span className="text-gray-500">Journal:</span>{" "}
                            <span className="text-gray-800">
                              {crystalData.citation.journal}
                              {crystalData.citation.year &&
                                ` (${crystalData.citation.year})`}
                              {crystalData.citation.volume &&
                                ` ${crystalData.citation.volume}`}
                              {crystalData.citation.page_first &&
                                `:${crystalData.citation.page_first}`}
                              {crystalData.citation.page_last &&
                                `-${crystalData.citation.page_last}`}
                            </span>
                          </div>
                        )}
                        {crystalData.citation.authors.length > 0 && (
                          <div>
                            <span className="text-gray-500">Authors:</span>{" "}
                            <span className="text-gray-800">
                              {crystalData.citation.authors.join("; ")}
                            </span>
                          </div>
                        )}
                        {crystalData.database_code && (
                          <div>
                            <span className="text-gray-500">ICSD:</span>{" "}
                            <span className="text-gray-800">
                              {crystalData.database_code}
                            </span>
                          </div>
                        )}
                      </div>
                    </ExpandableSection>
                  )}
                </div>
              </ExpandableSection>
            </div>
          )}

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
                  hasData={
                    app.id === "band-structure" ? hasBandStructures :
                    app.id === "brillouin-zone" ? (project.has_cif && crystalData?.space_group_IT_number !== undefined) :
                    app.id === "sirius" ? project.has_cif :
                    false
                  }
                  onClick={() => onOpenMiniApp(app.id)}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
