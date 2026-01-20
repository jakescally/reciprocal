import { useState, useEffect, useRef, useCallback } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { cn } from "../lib/utils";
import {
  Project,
  BandStructureInfo,
  importBandStructure,
  listBandStructures,
  loadBandStructureFiles,
  loadBandStructureLabels,
  updateBandStructureLabels,
  loadBandStructureAtomNames,
  updateBandStructureAtomNames,
  loadCrystalData,
} from "../lib/projects";
import {
  getBravaisLattice,
  autoDetectKPointLabels,
  getBravaisLatticeName,
  BravaisLattice,
} from "../lib/brillouinZone";
import {
  BandStructureData,
  parseBandStructure,
  calculateKPathDistance,
  getProjectionWeight,
  getOrbitalIndices,
  ORBITAL_GROUPS,
} from "../lib/bandStructureParser";

interface BandStructurePageProps {
  project: Project;
}

type ProjectionMode = "total" | "atom" | "orbital";
type OrbitalType = keyof typeof ORBITAL_GROUPS;
type ColorMode = "single" | "rainbow";

// Predefined colors for single-color mode
const BAND_COLORS = {
  blue: "rgb(59, 130, 246)",
  red: "rgb(239, 68, 68)",
  green: "rgb(34, 197, 94)",
  purple: "rgb(168, 85, 247)",
  orange: "rgb(249, 115, 22)",
  cyan: "rgb(6, 182, 212)",
  pink: "rgb(236, 72, 153)",
  gray: "rgb(107, 114, 128)",
} as const;

type BandColorName = keyof typeof BAND_COLORS;

interface PlotSettings {
  energyMin: number;
  energyMax: number;
  projectionMode: ProjectionMode;
  selectedAtom: number;  // 1-based, 0 = all
  selectedOrbital: OrbitalType;
  fatBandScale: number;
  showFermiLevel: boolean;
  colorMode: ColorMode;
  bandColor: BandColorName;
  rainbowScale: number;  // Multiplier for rainbow color spread (1 = default, higher = faster color change)
}

const DEFAULT_SETTINGS: PlotSettings = {
  energyMin: -12,
  energyMax: 12,
  projectionMode: "total",
  selectedAtom: 0,
  selectedOrbital: "total",
  fatBandScale: 5,
  showFermiLevel: true,
  colorMode: "rainbow",
  bandColor: "blue",
  rainbowScale: 1,
};

export function BandStructurePage({ project }: BandStructurePageProps) {
  // State for band structure list and selection
  const [bandStructures, setBandStructures] = useState<BandStructureInfo[]>([]);
  const [selectedBandStructure, setSelectedBandStructure] = useState<BandStructureInfo | null>(null);
  const [bandData, setBandData] = useState<BandStructureData | null>(null);
  const [kPathDistances, setKPathDistances] = useState<number[]>([]);
  const [customLabels, setCustomLabels] = useState<Record<string, string>>({});
  const [customAtomNames, setCustomAtomNames] = useState<Record<number, string>>({});

  // Bravais lattice for auto-detecting k-point labels
  const [bravaisLattice, setBravaisLattice] = useState<BravaisLattice | null>(null);

  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [showUploadUI, setShowUploadUI] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Plot settings
  const [settings, setSettings] = useState<PlotSettings>(DEFAULT_SETTINGS);

  // Canvas ref for plotting
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load crystal data on mount to get Bravais lattice
  useEffect(() => {
    const loadCrystal = async () => {
      if (project.has_cif) {
        try {
          const data = await loadCrystalData(project.id);
          if (data?.space_group_IT_number) {
            const lattice = getBravaisLattice(data.space_group_IT_number, data.space_group_HM);
            setBravaisLattice(lattice);
          }
        } catch (err) {
          console.error("Failed to load crystal data:", err);
        }
      }
    };
    loadCrystal();
  }, [project.id, project.has_cif]);

  // Load existing band structures on mount
  useEffect(() => {
    loadBandStructureList();
  }, [project.id]);

  // Auto-detect k-point labels when Bravais lattice becomes available
  // (handles case where crystal data loads after band structure)
  useEffect(() => {
    const autoDetect = async () => {
      if (
        bravaisLattice &&
        bandData &&
        selectedBandStructure &&
        Object.keys(customLabels).length === 0
      ) {
        const detectedLabels = autoDetectKPointLabels(
          bandData.kPoints,
          bandData.highSymmetryIndices,
          bravaisLattice
        );
        if (Object.keys(detectedLabels).length > 0) {
          setCustomLabels(detectedLabels);
          // Save the auto-detected labels
          await updateBandStructureLabels(project.id, selectedBandStructure.id, detectedLabels);
        }
      }
    };
    autoDetect();
  }, [bravaisLattice, bandData, selectedBandStructure, project.id]);

  const loadBandStructureList = async () => {
    setIsLoading(true);
    try {
      const list = await listBandStructures(project.id);
      setBandStructures(list);

      // Auto-select the first one if available
      if (list.length > 0 && !selectedBandStructure) {
        await selectBandStructure(list[0]);
      } else if (list.length === 0) {
        setShowUploadUI(true);
      }
    } catch (err) {
      console.error("Failed to load band structures:", err);
      setError(String(err));
    }
    setIsLoading(false);
  };

  const selectBandStructure = async (info: BandStructureInfo) => {
    setSelectedBandStructure(info);
    setIsLoading(true);
    setError(null);

    try {
      const [qtlContent, klistContent] = await loadBandStructureFiles(project.id, info.id);
      const data = parseBandStructure(qtlContent, klistContent);
      setBandData(data);
      setKPathDistances(calculateKPathDistance(data.kPoints));

      // Load custom labels and atom names if any
      const labels = await loadBandStructureLabels(project.id, info.id);
      const atomNames = await loadBandStructureAtomNames(project.id, info.id);
      setCustomAtomNames(atomNames || {});

      // If no custom labels exist and we have a Bravais lattice, auto-detect labels
      if ((!labels || Object.keys(labels).length === 0) && bravaisLattice) {
        const detectedLabels = autoDetectKPointLabels(
          data.kPoints,
          data.highSymmetryIndices,
          bravaisLattice
        );
        if (Object.keys(detectedLabels).length > 0) {
          setCustomLabels(detectedLabels);
          // Save the auto-detected labels
          await updateBandStructureLabels(project.id, info.id, detectedLabels);
        } else {
          setCustomLabels({});
        }
      } else {
        setCustomLabels(labels || {});
      }

      setShowUploadUI(false);
    } catch (err) {
      console.error("Failed to load band structure:", err);
      setError(String(err));
    }
    setIsLoading(false);
  };

  const handleImport = async () => {
    setIsImporting(true);
    setError(null);

    try {
      // Select QTL file
      const qtlFile = await open({
        multiple: false,
        filters: [{ name: "QTL Files", extensions: ["qtl"] }],
        title: "Select .qtl file",
      });

      if (!qtlFile) {
        setIsImporting(false);
        return;
      }

      // Select klist_band file
      const klistFile = await open({
        multiple: false,
        filters: [{ name: "K-list Files", extensions: ["klist_band"] }],
        title: "Select .klist_band file",
      });

      if (!klistFile) {
        setIsImporting(false);
        return;
      }

      // Extract filenames (in Tauri v2, open() returns string directly)
      const qtlPath = qtlFile;
      const klistPath = klistFile;
      const qtlFilename = qtlPath.split(/[/\\]/).pop() || "data.qtl";
      const klistFilename = klistPath.split(/[/\\]/).pop() || "data.klist_band";

      // Generate a name from the filename
      const name = qtlFilename.replace(/\.qtl$/i, "");

      // Import
      const info = await importBandStructure(
        project.id,
        name,
        qtlPath,
        qtlFilename,
        klistPath,
        klistFilename
      );

      // Reload list and select the new one
      await loadBandStructureList();
      await selectBandStructure(info);
    } catch (err) {
      console.error("Failed to import band structure:", err);
      setError(String(err));
    }

    setIsImporting(false);
  };

  const handleLabelChange = async (kLabel: string, newLabel: string) => {
    const updated = { ...customLabels, [kLabel]: newLabel };
    setCustomLabels(updated);

    if (selectedBandStructure) {
      try {
        await updateBandStructureLabels(project.id, selectedBandStructure.id, updated);
      } catch (err) {
        console.error("Failed to save labels:", err);
      }
    }
  };

  const handleAtomNameChange = async (atomIndex: number, newName: string) => {
    const updated = { ...customAtomNames, [atomIndex]: newName };
    setCustomAtomNames(updated);

    if (selectedBandStructure) {
      try {
        await updateBandStructureAtomNames(project.id, selectedBandStructure.id, updated);
      } catch (err) {
        console.error("Failed to save atom names:", err);
      }
    }
  };

  // Helper to get atom display name
  const getAtomDisplayName = (atomIndex: number) => {
    return customAtomNames[atomIndex] || `Atom ${atomIndex}`;
  };

  // Draw the band structure plot
  const drawPlot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bandData || kPathDistances.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Margins
    const margin = { top: 20, right: 20, bottom: 50, left: 60 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    // Clear
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.fillRect(0, 0, width, height);

    // Scales
    const xMin = 0;
    const xMax = kPathDistances[kPathDistances.length - 1];
    const yMin = settings.energyMin;
    const yMax = settings.energyMax;

    const scaleX = (x: number) => margin.left + ((x - xMin) / (xMax - xMin)) * plotWidth;
    const scaleY = (y: number) => margin.top + plotHeight - ((y - yMin) / (yMax - yMin)) * plotHeight;

    // Draw grid lines at high-symmetry points
    ctx.strokeStyle = "rgba(128, 128, 128, 0.3)";
    ctx.lineWidth = 1;
    for (const idx of bandData.highSymmetryIndices) {
      const x = scaleX(kPathDistances[idx]);
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, margin.top + plotHeight);
      ctx.stroke();
    }

    // Draw Fermi level dashed line
    if (settings.showFermiLevel) {
      const fermiY = scaleY(0);
      ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(margin.left, fermiY);
      ctx.lineTo(margin.left + plotWidth, fermiY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Rainbow color based on band index (cyan -> green -> yellow, with adjustable scale)
    const getRainbowColor = (bandIndex: number, totalBands: number) => {
      // Base hue range: 180 (cyan) -> 60 (yellow) = 120 degrees
      // Scale multiplier increases the range, wrapping around the color wheel
      const baseRange = 120 * settings.rainbowScale;
      const normalizedIndex = bandIndex / Math.max(1, totalBands - 1);
      // Start at cyan (180) and go backwards through green to yellow (and beyond with higher scale)
      const hue = (180 - normalizedIndex * baseRange + 360) % 360;
      return `hsl(${hue}, 80%, 50%)`;
    };

    // Color for bands based on settings
    const getBandColor = (bandIndex: number, totalBands: number, weight: number = 1) => {
      if (settings.projectionMode !== "total") {
        // For projections, use weight to determine opacity
        const alpha = Math.min(1, weight * 2);
        return `rgba(220, 38, 38, ${alpha})`; // Red with varying opacity
      }

      if (settings.colorMode === "rainbow") {
        return getRainbowColor(bandIndex, totalBands);
      }

      return BAND_COLORS[settings.bandColor];
    };

    const totalBands = bandData.bands.length;

    // Draw bands
    for (let bandIdx = 0; bandIdx < bandData.bands.length; bandIdx++) {
      const band = bandData.bands[bandIdx];
      if (band.points.length < 2) continue;

      // Sort points by k-index
      const sortedPoints = [...band.points].sort((a, b) => a.kPointIndex - b.kPointIndex);

      if (settings.projectionMode === "total") {
        // Draw as connected lines
        ctx.strokeStyle = getBandColor(bandIdx, totalBands);
        ctx.lineWidth = 1.5;
        ctx.beginPath();

        let started = false;
        for (let i = 0; i < sortedPoints.length; i++) {
          const point = sortedPoints[i];
          const x = scaleX(kPathDistances[point.kPointIndex]);
          const y = scaleY(point.energy);

          if (point.energy < yMin || point.energy > yMax) {
            started = false;
            continue;
          }

          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      } else {
        // Draw as fat bands (scatter with varying sizes)
        for (const point of sortedPoints) {
          if (point.energy < yMin || point.energy > yMax) continue;

          const x = scaleX(kPathDistances[point.kPointIndex]);
          const y = scaleY(point.energy);

          // Calculate projection weight
          let weight = 0;
          const atomIndices = settings.selectedAtom > 0 ? [settings.selectedAtom] : [];
          const orbitalIndices = getOrbitalIndices(settings.selectedOrbital);

          weight = getProjectionWeight(point, atomIndices, orbitalIndices);

          // Draw circle with size based on weight
          const radius = Math.max(1, weight * settings.fatBandScale);
          ctx.fillStyle = getBandColor(bandIdx, totalBands, weight);
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Draw axes
    ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
    ctx.lineWidth = 1;

    // Y axis
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + plotHeight);
    ctx.stroke();

    // X axis
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top + plotHeight);
    ctx.lineTo(margin.left + plotWidth, margin.top + plotHeight);
    ctx.stroke();

    // Y axis labels
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.font = "12px system-ui";
    ctx.textAlign = "right";

    const yTickCount = 8;
    const yStep = (yMax - yMin) / yTickCount;
    let drewEF = false;

    for (let i = 0; i <= yTickCount; i++) {
      const yVal = yMin + i * yStep;
      const y = scaleY(yVal);

      // Skip the 0.0 label if showing Fermi level (EF will be shown instead)
      const isNearZero = Math.abs(yVal) < 0.01;
      if (isNearZero && settings.showFermiLevel) {
        // Draw "EF" instead of "0.0"
        ctx.fillText("EF", margin.left - 8, y + 4);
        drewEF = true;
      } else {
        ctx.fillText(yVal.toFixed(1), margin.left - 8, y + 4);
      }

      // Tick mark
      ctx.beginPath();
      ctx.moveTo(margin.left - 4, y);
      ctx.lineTo(margin.left, y);
      ctx.stroke();
    }

    // If showing Fermi level but 0 wasn't a tick value, draw EF label at E=0
    if (settings.showFermiLevel && !drewEF && yMin <= 0 && yMax >= 0) {
      const fermiY = scaleY(0);
      ctx.fillText("EF", margin.left - 8, fermiY + 4);
    }

    // Y axis title
    ctx.save();
    ctx.translate(15, margin.top + plotHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.font = "14px system-ui";
    ctx.fillText("Energy (eV)", 0, 0);
    ctx.restore();

    // X axis labels (high-symmetry points)
    ctx.textAlign = "center";
    ctx.font = "14px system-ui";
    for (const idx of bandData.highSymmetryIndices) {
      const kPoint = bandData.kPoints[idx];
      const x = scaleX(kPathDistances[idx]);

      // Use custom label if available, otherwise use the default
      let label = customLabels[kPoint.label || ""] || kPoint.label || "";

      // Convert common labels to symbols
      if (label === "K.2" || label === "GM" || label.toLowerCase() === "gamma") {
        label = "Γ";
      }

      ctx.fillText(label, x, margin.top + plotHeight + 25);
    }

    // Draw plot border
    ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
    ctx.strokeRect(margin.left, margin.top, plotWidth, plotHeight);

  }, [bandData, kPathDistances, settings, customLabels]);

  // Redraw when data or settings change
  useEffect(() => {
    drawPlot();
  }, [drawPlot]);

  // Redraw on resize
  useEffect(() => {
    const handleResize = () => drawPlot();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [drawPlot]);

  // Upload UI (shown when no band structures or manually triggered)
  if (showUploadUI || bandStructures.length === 0) {
    return (
      <div className="h-screen w-full overflow-hidden flex flex-col">
        {/* Upload Area */}
        <div className="flex-1 px-8 pt-28 pb-8">
          <div className="max-w-[800px] mx-auto">
            <div className="glass rounded-3xl p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  Import Band Structure Data
                </h2>
                <p className="text-gray-600 max-w-md mx-auto">
                  Upload Wien2k files to visualize electronic band structure with orbital projections.
                </p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="glass rounded-xl p-4">
                  <h3 className="font-medium text-gray-800 mb-2">Required Files:</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-mono">.qtl</span>
                      <span>- Contains band energies and orbital character for each k-point</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-mono">.klist_band</span>
                      <span>- Contains the k-point path with high-symmetry point labels</span>
                    </li>
                  </ul>
                </div>

                <div className="glass rounded-xl p-4">
                  <h3 className="font-medium text-gray-800 mb-2">Features:</h3>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• Total band structure visualization</li>
                    <li>• Atom-projected "fat bands"</li>
                    <li>• Orbital-projected bands (s, p, d, f)</li>
                    <li>• Adjustable energy range and Fermi level</li>
                    <li>• Customizable high-symmetry point labels</li>
                  </ul>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-4 bg-red-50 rounded-xl text-red-700 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleImport}
                disabled={isImporting}
                className={cn(
                  "w-full py-4 rounded-xl font-medium transition-all",
                  isImporting
                    ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                    : "bg-primary text-white hover:bg-primary/90 active:scale-[0.98]"
                )}
              >
                {isImporting ? "Importing..." : "Select Files to Import"}
              </button>

              {bandStructures.length > 0 && (
                <button
                  onClick={() => setShowUploadUI(false)}
                  className="w-full mt-3 py-3 rounded-xl text-gray-600 hover:bg-white/30 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main plot view
  return (
    <div className="h-screen w-full overflow-hidden flex flex-col">
      {/* Sub-header with controls */}
      <div className="pt-28 px-8 pb-4">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-500">
                {selectedBandStructure?.name || "No data loaded"}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Band structure selector */}
              {bandStructures.length > 1 && (
                <select
                  value={selectedBandStructure?.id || ""}
                  onChange={(e) => {
                    const bs = bandStructures.find(b => b.id === e.target.value);
                    if (bs) selectBandStructure(bs);
                  }}
                  className="glass rounded-xl px-4 py-2 text-sm outline-none"
                >
                  {bandStructures.map(bs => (
                    <option key={bs.id} value={bs.id}>{bs.name}</option>
                  ))}
                </select>
              )}

              <button
                onClick={() => setShowUploadUI(true)}
                className="glass glass-hover rounded-xl px-4 py-2 text-sm font-medium transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Import New
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 px-8 pb-8 flex gap-6 min-h-0">
        <div className="max-w-[1600px] mx-auto flex gap-6 w-full">
          {/* Plot area */}
          <div className="flex-1 bg-white rounded-3xl p-4 min-h-0 shadow-lg">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                Loading...
              </div>
            ) : error ? (
              <div className="h-full flex items-center justify-center text-red-500">
                Error: {error}
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                className="w-full h-full"
                style={{ display: "block" }}
              />
            )}
          </div>

          {/* Controls sidebar */}
          <div className="w-72 glass rounded-3xl p-6 overflow-y-auto">
            <h3 className="font-semibold text-gray-800 mb-4">Plot Settings</h3>

            {/* Projection Mode */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Projection Mode
              </label>
              <div className="space-y-2">
                {(["total", "atom", "orbital"] as ProjectionMode[]).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setSettings(s => ({ ...s, projectionMode: mode }))}
                    className={cn(
                      "w-full px-4 py-2 rounded-xl text-sm font-medium transition-all text-left border",
                      settings.projectionMode === mode
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-white/50 text-gray-700 border-gray-200 hover:bg-white/70 hover:border-gray-300"
                    )}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Mode (shown in total mode) */}
            {settings.projectionMode === "total" && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color Mode
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSettings(s => ({ ...s, colorMode: "rainbow" }))}
                    className={cn(
                      "flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all border",
                      settings.colorMode === "rainbow"
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-white/50 text-gray-700 border-gray-200 hover:bg-white/70 hover:border-gray-300"
                    )}
                  >
                    Rainbow
                  </button>
                  <button
                    onClick={() => setSettings(s => ({ ...s, colorMode: "single" }))}
                    className={cn(
                      "flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all border",
                      settings.colorMode === "single"
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-white/50 text-gray-700 border-gray-200 hover:bg-white/70 hover:border-gray-300"
                    )}
                  >
                    Single
                  </button>
                </div>
              </div>
            )}

            {/* Rainbow Scale (shown in total + rainbow mode) */}
            {settings.projectionMode === "total" && settings.colorMode === "rainbow" && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color Spread: {settings.rainbowScale.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="5"
                  step="0.1"
                  value={settings.rainbowScale}
                  onChange={(e) => setSettings(s => ({ ...s, rainbowScale: parseFloat(e.target.value) }))}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Higher values = more color variation
                </p>
              </div>
            )}

            {/* Band Color (shown in total + single color mode) */}
            {settings.projectionMode === "total" && settings.colorMode === "single" && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Band Color
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.keys(BAND_COLORS) as BandColorName[]).map(colorName => (
                    <button
                      key={colorName}
                      onClick={() => setSettings(s => ({ ...s, bandColor: colorName }))}
                      className={cn(
                        "w-full aspect-square rounded-lg transition-all",
                        settings.bandColor === colorName
                          ? "ring-2 ring-primary ring-offset-2"
                          : "hover:scale-110"
                      )}
                      style={{ backgroundColor: BAND_COLORS[colorName] }}
                      title={colorName.charAt(0).toUpperCase() + colorName.slice(1)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Atom selector (shown when atom or orbital mode) */}
            {settings.projectionMode !== "total" && bandData && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Atom
                </label>
                <select
                  value={settings.selectedAtom}
                  onChange={(e) => setSettings(s => ({ ...s, selectedAtom: parseInt(e.target.value) }))}
                  className="w-full px-4 py-2 rounded-xl bg-white/50 border border-gray-200 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  <option value={0}>All Atoms</option>
                  {bandData.atoms.map((atom) => (
                    <option key={atom.index} value={atom.index}>
                      {getAtomDisplayName(atom.index)} (mult: {atom.multiplicity})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Orbital selector (shown when orbital mode) */}
            {settings.projectionMode === "orbital" && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Orbital
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(ORBITAL_GROUPS) as OrbitalType[]).map(orbital => (
                    <button
                      key={orbital}
                      onClick={() => setSettings(s => ({ ...s, selectedOrbital: orbital }))}
                      className={cn(
                        "px-3 py-2 rounded-lg text-sm font-medium transition-all border",
                        settings.selectedOrbital === orbital
                          ? "bg-primary text-white border-primary shadow-sm"
                          : "bg-white/50 text-gray-700 border-gray-200 hover:bg-white/70 hover:border-gray-300"
                      )}
                    >
                      {orbital}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Fat band scale (shown for projection modes) */}
            {settings.projectionMode !== "total" && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fat Band Scale: {settings.fatBandScale}
                </label>
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={settings.fatBandScale}
                  onChange={(e) => setSettings(s => ({ ...s, fatBandScale: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>
            )}

            {/* Energy range */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Energy Range (eV)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings.energyMin}
                  onChange={(e) => setSettings(s => ({ ...s, energyMin: parseFloat(e.target.value) || -8 }))}
                  className="w-20 px-2 py-1 rounded-lg bg-white/50 border border-gray-200 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="number"
                  value={settings.energyMax}
                  onChange={(e) => setSettings(s => ({ ...s, energyMax: parseFloat(e.target.value) || 8 }))}
                  className="w-20 px-2 py-1 rounded-lg bg-white/50 border border-gray-200 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Fermi level toggle */}
            <div className="mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showFermiLevel}
                  onChange={(e) => setSettings(s => ({ ...s, showFermiLevel: e.target.checked }))}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-gray-700">Show Fermi Level</span>
              </label>
            </div>

            {/* Atom names */}
            {bandData && bandData.atoms.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Atom Names
                </label>
                <div className="space-y-2">
                  {bandData.atoms.map((atom) => (
                    <div key={atom.index} className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-16">Atom {atom.index}</span>
                      <input
                        type="text"
                        value={customAtomNames[atom.index] || ""}
                        onChange={(e) => handleAtomNameChange(atom.index, e.target.value)}
                        onFocus={(e) => e.target.select()}
                        placeholder={`Atom ${atom.index}`}
                        className="flex-1 px-2 py-1 rounded-lg bg-white/50 border border-gray-200 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Enter atom symbols (e.g., Ni, Si, Fe)
                </p>
              </div>
            )}

            {/* High-symmetry point labels */}
            {bandData && bandData.highSymmetryIndices.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  K-Point Labels
                </label>
                <div className="space-y-2">
                  {bandData.highSymmetryIndices.map(idx => {
                    const kPoint = bandData.kPoints[idx];
                    const label = kPoint.label || `K${idx}`;
                    const displayLabel = customLabels[label] || label;

                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-16">{label}</span>
                        <input
                          type="text"
                          value={displayLabel}
                          onChange={(e) => handleLabelChange(label, e.target.value)}
                          onFocus={(e) => e.target.select()}
                          placeholder={label}
                          className="flex-1 px-2 py-1 rounded-lg bg-white/50 border border-gray-200 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Tip: Use "Γ" for Gamma point
                </p>
              </div>
            )}

            {/* Info */}
            {bandData && (
              <div className="text-xs text-gray-500 space-y-1">
                <p>Bands: {bandData.bands.length}</p>
                <p>K-points: {bandData.kPoints.length}</p>
                <p>Atoms: {bandData.numAtoms}</p>
                <p>Fermi Energy: {bandData.fermiEnergy.toFixed(3)} eV</p>
                {bravaisLattice && (
                  <p className="pt-2 border-t border-gray-200 mt-2">
                    Lattice: {getBravaisLatticeName(bravaisLattice)} ({bravaisLattice})
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
