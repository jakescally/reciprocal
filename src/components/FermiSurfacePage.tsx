import { useState, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";
import * as THREE from "three";
import { open } from "@tauri-apps/plugin-dialog";
import {
  Project,
  FermiSurfaceInfo,
  listFermiSurfaces,
  loadFermiSurfaceFiles,
  importFermiSurface,
  deleteFermiSurface,
  formatRelativeTime,
} from "../lib/projects";
import {
  buildWien2kBandGrid,
  findFermiCrossingBandsFromGrid,
  extractCaseName,
  Wien2kBandGrid,
} from "../lib/wien2kFermiGrid";
import { shiftToFermiLevel, EnergyGrid } from "../lib/gridInterpolation";
import { marchingCubes, IsosurfaceMesh } from "../lib/marchingCubes";

interface FermiSurfacePageProps {
  project: Project;
}

// Band colors for multi-band display
const BAND_COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#22c55e", // green
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

// BZ wireframe for context
function BZWireframe() {
  // Simple cubic BZ wireframe for reference
  const vertices = useMemo(() => {
    const v: THREE.Vector3[] = [];
    for (let x = -1; x <= 1; x += 2) {
      for (let y = -1; y <= 1; y += 2) {
        for (let z = -1; z <= 1; z += 2) {
          v.push(new THREE.Vector3(x * 0.5, y * 0.5, z * 0.5));
        }
      }
    }
    return v;
  }, []);

  const edges = useMemo(() => {
    // Cube edges
    const e: [THREE.Vector3, THREE.Vector3][] = [];
    // Bottom face
    e.push([vertices[0], vertices[1]]);
    e.push([vertices[1], vertices[3]]);
    e.push([vertices[3], vertices[2]]);
    e.push([vertices[2], vertices[0]]);
    // Top face
    e.push([vertices[4], vertices[5]]);
    e.push([vertices[5], vertices[7]]);
    e.push([vertices[7], vertices[6]]);
    e.push([vertices[6], vertices[4]]);
    // Vertical edges
    e.push([vertices[0], vertices[4]]);
    e.push([vertices[1], vertices[5]]);
    e.push([vertices[2], vertices[6]]);
    e.push([vertices[3], vertices[7]]);
    return e;
  }, [vertices]);

  return (
    <group>
      {edges.map((edge, idx) => (
        <Line
          key={idx}
          points={[edge[0], edge[1]]}
          color="#cbd5e1"
          lineWidth={1}
          opacity={0.5}
          transparent
        />
      ))}
    </group>
  );
}

// Fermi surface mesh component
function FermiSurfaceMesh({
  mesh,
  color,
  opacity = 0.85,
}: {
  mesh: IsosurfaceMesh;
  color: string;
  opacity?: number;
}) {
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(mesh.positions, 3));
    geom.setAttribute("normal", new THREE.BufferAttribute(mesh.normals, 3));
    geom.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
    return geom;
  }, [mesh]);

  if (mesh.vertexCount === 0) return null;

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={color}
        side={THREE.DoubleSide}
        transparent
        opacity={opacity}
        metalness={0.3}
        roughness={0.5}
      />
    </mesh>
  );
}

// Main 3D scene
function Scene({
  meshes,
  showBZ,
}: {
  meshes: Array<{ mesh: IsosurfaceMesh; color: string; bandIndex: number }>;
  showBZ: boolean;
}) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-5, -5, -5]} intensity={0.4} />
      <directionalLight position={[0, 5, 0]} intensity={0.3} />

      <group>
        {showBZ && <BZWireframe />}
        {meshes.map((m, idx) => (
          <FermiSurfaceMesh key={idx} mesh={m.mesh} color={m.color} />
        ))}
      </group>

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={0.5}
        maxDistance={10}
      />
    </>
  );
}

export function FermiSurfacePage({ project }: FermiSurfacePageProps) {
  // State for Fermi surface data
  const [fermiSurfaces, setFermiSurfaces] = useState<FermiSurfaceInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rawData, setRawData] = useState<Wien2kBandGrid | null>(null);
  const [energyGrid, setEnergyGrid] = useState<EnergyGrid | null>(null);
  const [crossingBands, setCrossingBands] = useState<number[]>([]);
  const [enabledBands, setEnabledBands] = useState<Set<number>>(new Set());

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBZ, setShowBZ] = useState(true);
  const [showImportPanel, setShowImportPanel] = useState(false);

  // Import file state
  const [importFiles, setImportFiles] = useState<{
    output1?: string;
    output2?: string;
    outputkgen?: string;
    struct?: string;
    caseName?: string;
  }>({});
  const [importName, setImportName] = useState("");

  // Load list of Fermi surfaces
  useEffect(() => {
    const load = async () => {
      try {
        const surfaces = await listFermiSurfaces(project.id);
        setFermiSurfaces(surfaces);
        if (surfaces.length > 0 && !selectedId) {
          setSelectedId(surfaces[0].id);
        }
      } catch (err) {
        console.error("Failed to load Fermi surfaces:", err);
      }
      setIsLoading(false);
    };
    load();
  }, [project.id]);

  // Load selected Fermi surface data
  useEffect(() => {
    if (!selectedId) {
      setRawData(null);
      setEnergyGrid(null);
      setCrossingBands([]);
      return;
    }

    const loadData = async () => {
      setIsProcessing(true);
      setError(null);

      try {
        const [output1, output2, outputkgen, _struct] = await loadFermiSurfaceFiles(project.id, selectedId);
        const surface = fermiSurfaces.find(s => s.id === selectedId);

        // Parse Wien2k files using Xcrysden-style bandgrid construction
        const data = buildWien2kBandGrid(
          output1,
          output2,
          outputkgen,
          surface?.case_name || "unknown"
        );
        setRawData(data);

        // Find bands crossing Fermi level
        const crossing = findFermiCrossingBandsFromGrid(
          data.energiesByKPoint,
          data.grid.fermiEnergy
        );
        setCrossingBands(crossing);
        setEnabledBands(new Set(crossing.slice(0, 4))); // Enable first 4 by default

        const shiftedGrid = shiftToFermiLevel(data.grid);
        setEnergyGrid(shiftedGrid);
      } catch (err) {
        console.error("Failed to process Fermi surface:", err);
        setError(String(err));
      }

      setIsProcessing(false);
    };

    loadData();
  }, [selectedId, project.id, fermiSurfaces]);

  // Generate meshes for enabled bands
  const meshes = useMemo(() => {
    if (!energyGrid) return [];

    const result: Array<{ mesh: IsosurfaceMesh; color: string; bandIndex: number }> = [];

    Array.from(enabledBands).forEach((bandIndex, i) => {
      if (bandIndex < 0 || bandIndex >= energyGrid.data.length) return;

      const mesh = marchingCubes(energyGrid, 0, bandIndex);
      if (mesh.vertexCount > 0) {
        result.push({
          mesh,
          color: BAND_COLORS[i % BAND_COLORS.length],
          bandIndex,
        });
      }
    });

    return result;
  }, [energyGrid, enabledBands]);

  // Handle file selection for import
  const selectFile = async (type: 'output1' | 'output2' | 'outputkgen' | 'struct') => {
    const extensions: Record<string, string[]> = {
      output1: ['output1'],
      output2: ['output2'],
      outputkgen: ['outputkgen'],
      struct: ['struct'],
    };

    try {
      const result = await open({
        multiple: false,
        filters: [{ name: `Wien2k ${type} file`, extensions: extensions[type] }],
      });

      if (result) {
        const path = result as string;
        const filename = path.split('/').pop() || path.split('\\').pop() || '';

        setImportFiles(prev => ({
          ...prev,
          [type]: path,
          caseName: prev.caseName || extractCaseName(filename),
        }));

        if (!importName) {
          setImportName(extractCaseName(filename));
        }
      }
    } catch (err) {
      console.error(`Failed to select ${type} file:`, err);
    }
  };

  // Handle import
  const handleImport = async () => {
    if (!importFiles.output1 || !importFiles.output2 || !importFiles.outputkgen || !importFiles.struct) {
      return;
    }

    setIsProcessing(true);
    try {
      const info = await importFermiSurface(
        project.id,
        importName || importFiles.caseName || "Fermi Surface",
        importFiles.output1,
        importFiles.output2,
        importFiles.outputkgen,
        importFiles.struct,
        importFiles.caseName || "unknown"
      );

      setFermiSurfaces(prev => [info, ...prev]);
      setSelectedId(info.id);
      setShowImportPanel(false);
      setImportFiles({});
      setImportName("");
    } catch (err) {
      console.error("Failed to import Fermi surface:", err);
      setError(String(err));
    }
    setIsProcessing(false);
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await deleteFermiSurface(project.id, id);
      setFermiSurfaces(prev => prev.filter(s => s.id !== id));
      if (selectedId === id) {
        setSelectedId(fermiSurfaces.find(s => s.id !== id)?.id || null);
      }
    } catch (err) {
      console.error("Failed to delete Fermi surface:", err);
    }
  };

  // Toggle band
  const toggleBand = (bandIndex: number) => {
    setEnabledBands(prev => {
      const next = new Set(prev);
      if (next.has(bandIndex)) {
        next.delete(bandIndex);
      } else {
        next.add(bandIndex);
      }
      return next;
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="glass rounded-3xl p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading Fermi surfaces...</p>
        </div>
      </div>
    );
  }

  // No Fermi surfaces imported
  if (fermiSurfaces.length === 0 && !showImportPanel) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="glass rounded-3xl p-8 text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            No Fermi Surfaces
          </h2>
          <p className="text-gray-600 mb-6">
            Import Wien2k output files to visualize Fermi surfaces
          </p>
          <button
            onClick={() => setShowImportPanel(true)}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Import Wien2k Files
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full overflow-hidden">
      {/* Full-screen 3D canvas */}
      <div className="absolute inset-0">
        <Canvas
          camera={{
            position: [1.5, 1.5, 1.5],
            fov: 45,
            near: 0.01,
            far: 100,
          }}
          style={{ background: "#ffffff" }}
        >
          <Scene meshes={meshes} showBZ={showBZ} />
        </Canvas>
      </div>

      {/* Import panel overlay */}
      {showImportPanel && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="glass rounded-3xl p-6 w-[500px] max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Import Wien2k Files</h3>
              <button
                onClick={() => setShowImportPanel(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Name input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={importName}
                  onChange={(e) => setImportName(e.target.value)}
                  placeholder="e.g., LaSb SOC"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* File selectors */}
              {(['output1', 'output2', 'outputkgen', 'struct'] as const).map((type) => (
                <div key={type}>
                  <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                    {type} file
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={importFiles[type]?.split('/').pop() || ''}
                      readOnly
                      placeholder={`Select .${type} file`}
                      className="flex-1 px-3 py-2 border rounded-lg bg-gray-50"
                    />
                    <button
                      onClick={() => selectFile(type)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Browse
                    </button>
                  </div>
                </div>
              ))}

              {/* Import button */}
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowImportPanel(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={!importFiles.output1 || !importFiles.output2 || !importFiles.outputkgen || !importFiles.struct || isProcessing}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? "Importing..." : "Import"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Processing overlay */}
      {isProcessing && !showImportPanel && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/50">
          <div className="glass rounded-2xl p-6 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-gray-600">Processing Fermi surface...</p>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-30">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Data selector card - top left */}
      <div className="absolute top-28 left-8 z-10">
        <div className="glass rounded-2xl p-5 min-w-[280px] max-w-[320px]">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-800">Fermi Surfaces</h3>
            <button
              onClick={() => setShowImportPanel(true)}
              className="text-blue-500 hover:text-blue-700 text-sm font-medium"
            >
              + Import
            </button>
          </div>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {fermiSurfaces.map((surface) => (
              <div
                key={surface.id}
                className={`p-2 rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                  selectedId === surface.id ? 'bg-blue-100' : 'hover:bg-gray-100'
                }`}
                onClick={() => setSelectedId(surface.id)}
              >
                <div>
                  <div className="font-medium text-gray-800 text-sm">{surface.name}</div>
                  <div className="text-xs text-gray-500">{formatRelativeTime(surface.created_at)}</div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(surface.id); }}
                  className="text-gray-400 hover:text-red-500 p-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info card - below selector */}
      {rawData && (
        <div className="absolute top-[310px] left-8 z-10">
          <div className="glass rounded-2xl p-5 min-w-[280px]">
            <h3 className="font-semibold text-gray-800 mb-3">Data Info</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Fermi Energy:</span>{" "}
                <span className="text-gray-800 font-medium">{rawData.grid.fermiEnergy.toFixed(3)} eV</span>
              </div>
              <div>
                <span className="text-gray-500">Total Bands:</span>{" "}
                <span className="text-gray-800 font-medium">{rawData.numBands}</span>
              </div>
              <div>
                <span className="text-gray-500">Crossing Bands:</span>{" "}
                <span className="text-gray-800 font-medium">{crossingBands.length}</span>
              </div>
              <div>
                <span className="text-gray-500">Irreducible k-points:</span>{" "}
                <span className="text-gray-800 font-medium">{rawData.irreducibleKPoints}</span>
              </div>
              <div>
                <span className="text-gray-500">Grid:</span>{" "}
                <span className="text-gray-800 font-medium">
                  {rawData.grid.nx} × {rawData.grid.ny} × {rawData.grid.nz}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Band selector card - top right */}
      {crossingBands.length > 0 && (
        <div className="absolute top-28 right-8 z-10">
          <div className="glass rounded-2xl p-5 min-w-[200px]">
            <h3 className="font-semibold text-gray-800 mb-3">Bands</h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {crossingBands.map((bandIndex) => (
                <label key={bandIndex} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabledBands.has(bandIndex)}
                    onChange={() => toggleBand(bandIndex)}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: BAND_COLORS[Array.from(enabledBands).indexOf(bandIndex) % BAND_COLORS.length] }}
                  />
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: enabledBands.has(bandIndex)
                        ? BAND_COLORS[Array.from(enabledBands).indexOf(bandIndex) % BAND_COLORS.length]
                        : '#d1d5db'
                    }}
                  />
                  <span className="text-sm text-gray-700">Band {bandIndex + 1}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Display options - bottom right */}
      <div className="absolute bottom-8 right-8 z-10">
        <div className="glass rounded-2xl p-5 min-w-[200px]">
          <h3 className="font-semibold text-gray-800 mb-3">Display Options</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showBZ}
                onChange={(e) => setShowBZ(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-gray-700">Show BZ Outline</span>
            </label>
            <div>
              <label className="text-sm text-gray-700 block mb-1">Grid Resolution</label>
              <div className="w-full px-2 py-1 border rounded text-sm text-gray-700 bg-white/70">
                {rawData ? `${rawData.grid.nx} × ${rawData.grid.ny} × ${rawData.grid.nz}` : "—"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend - bottom center */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
        <div className="glass rounded-2xl px-6 py-3 flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-slate-300" />
            <span className="text-gray-600">Brillouin Zone</span>
          </div>
          {meshes.slice(0, 4).map((m, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: m.color }}
              />
              <span className="text-gray-600">Band {m.bandIndex + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
