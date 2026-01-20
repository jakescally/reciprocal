/**
 * Parser for Wien2k .qtl and .klist_band files
 *
 * QTL file contains:
 * - Fermi energy
 * - Atom definitions with orbital labels
 * - Band energies and orbital character for each k-point
 *
 * klist_band file contains:
 * - K-point path with high-symmetry point labels
 */

// Rydberg to eV conversion factor
const RY_TO_EV = 13.605693122994;

// Orbital types from Wien2k ISPLIT=8
export const ORBITAL_LABELS = [
  "tot", "s", "p", "px", "py", "pz", "d", "dz2", "dx2y2", "dxy", "dxz", "dyz", "f"
] as const;

export type OrbitalType = typeof ORBITAL_LABELS[number];

// Grouped orbital categories for UI
export const ORBITAL_GROUPS = {
  total: ["tot"],
  s: ["s"],
  p: ["p", "px", "py", "pz"],
  d: ["d", "dz2", "dx2y2", "dxy", "dxz", "dyz"],
  f: ["f"],
} as const;

export interface AtomDefinition {
  index: number;
  multiplicity: number;
  isplit: number;
  orbitalLabels: string[];
}

export interface KPoint {
  index: number;
  kx: number;
  ky: number;
  kz: number;
  label?: string;  // High-symmetry point label (e.g., "Γ", "X", "M")
  isHighSymmetry: boolean;
}

export interface BandPoint {
  kPointIndex: number;
  energy: number;  // in eV, relative to Fermi level
  // Orbital weights per atom: atomWeights[atomIndex][orbitalIndex]
  atomWeights: number[][];
}

export interface Band {
  index: number;
  points: BandPoint[];
}

export interface BandStructureData {
  caseName: string;
  latticeConstants: { a: number; b: number; c: number };
  fermiEnergy: number;  // in eV
  numAtoms: number;
  spinPolarized: boolean;
  spinOrbit: boolean;
  atoms: AtomDefinition[];
  kPoints: KPoint[];
  bands: Band[];
  // Metadata
  highSymmetryIndices: number[];  // Indices of k-points that are high-symmetry points
}

/**
 * Parse a Wien2k .klist_band file
 */
export function parseKlistBand(content: string): { kPoints: KPoint[]; highSymmetryIndices: number[] } {
  const lines = content.split("\n");
  const kPoints: KPoint[] = [];
  const highSymmetryIndices: number[] = [];

  let kIndex = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === "END") continue;

    // Check if this line has a label (starts with K.N or similar)
    const labelMatch = trimmed.match(/^([A-Z]+\.?\d*)\s+/i);
    const isHighSymmetry = labelMatch !== null;

    // Parse k-point coordinates
    // Format: [label] kx ky kz divisor weight [energy_range]
    const parts = trimmed.split(/\s+/).filter(p => p.length > 0);

    let startIdx = isHighSymmetry ? 1 : 0;

    if (parts.length >= startIdx + 4) {
      const kx = parseInt(parts[startIdx], 10);
      const ky = parseInt(parts[startIdx + 1], 10);
      const kz = parseInt(parts[startIdx + 2], 10);
      const divisor = parseInt(parts[startIdx + 3], 10);

      if (!isNaN(kx) && !isNaN(ky) && !isNaN(kz) && !isNaN(divisor) && divisor !== 0) {
        const kPoint: KPoint = {
          index: kIndex,
          kx: kx / divisor,
          ky: ky / divisor,
          kz: kz / divisor,
          isHighSymmetry,
          label: isHighSymmetry ? labelMatch![1] : undefined,
        };

        if (isHighSymmetry) {
          highSymmetryIndices.push(kIndex);
        }

        kPoints.push(kPoint);
        kIndex++;
      }
    }
  }

  return { kPoints, highSymmetryIndices };
}

/**
 * Parse a Wien2k .qtl file
 */
export function parseQtl(content: string, _kPoints: KPoint[]): Omit<BandStructureData, "kPoints" | "highSymmetryIndices"> {
  const lines = content.split("\n");

  // Line 1: Case name
  const caseName = lines[0]?.trim() || "Unknown";

  // Line 3: Lattice constants and Fermi energy
  // Format: LATTICE CONST.= a b c FERMI ENERGY= ef
  const line3 = lines[2] || "";
  const latticeMatch = line3.match(/LATTICE CONST\.\s*=\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  const fermiMatch = line3.match(/FERMI ENERGY\s*=\s*([\d.-]+)/);

  const latticeConstants = latticeMatch
    ? { a: parseFloat(latticeMatch[1]), b: parseFloat(latticeMatch[2]), c: parseFloat(latticeMatch[3]) }
    : { a: 0, b: 0, c: 0 };

  // Convert Fermi energy from Rydberg to eV
  const fermiEnergyRy = fermiMatch ? parseFloat(fermiMatch[1]) : 0;
  const fermiEnergy = fermiEnergyRy * RY_TO_EV;

  // Line 4: Band info
  // Format: nmat < NMAT < nmat2 SPIN=spin NAT=nat SO so
  const line4 = lines[3] || "";
  const natMatch = line4.match(/NAT\s*=\s*(\d+)/);
  const spinMatch = line4.match(/SPIN\s*=\s*(\d+)/);
  const soMatch = line4.match(/SO\s+(\d+)/);

  const numAtoms = natMatch ? parseInt(natMatch[1], 10) : 0;
  const spinPolarized = spinMatch ? parseInt(spinMatch[1], 10) > 1 : false;
  const spinOrbit = soMatch ? parseInt(soMatch[1], 10) > 0 : false;

  // Parse atom definitions (JATOM lines)
  const atoms: AtomDefinition[] = [];
  let lineIdx = 4;

  while (lineIdx < lines.length && lines[lineIdx]?.includes("JATOM")) {
    const jatomLine = lines[lineIdx];
    const jatomMatch = jatomLine.match(/JATOM\s+(\d+)\s+MULT\s*=\s*(\d+)\s+ISPLIT\s*=\s*(\d+)\s+(.*)/);

    if (jatomMatch) {
      const orbitalLabels = jatomMatch[4].split(",").map(s => s.trim().toLowerCase());
      atoms.push({
        index: parseInt(jatomMatch[1], 10),
        multiplicity: parseInt(jatomMatch[2], 10),
        isplit: parseInt(jatomMatch[3], 10),
        orbitalLabels,
      });
    }
    lineIdx++;
  }

  // Parse bands
  const bands: Band[] = [];
  let currentBand: Band | null = null;
  let kPointIdx = 0;

  for (let i = lineIdx; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;

    // Check for BAND header
    const bandMatch = line.match(/^BAND\s+(\d+)/);
    if (bandMatch) {
      if (currentBand) {
        bands.push(currentBand);
      }
      currentBand = {
        index: parseInt(bandMatch[1], 10),
        points: [],
      };
      kPointIdx = 0;
      continue;
    }

    // Parse data line
    // Format: energy atomIndex total [orbital weights...]
    if (currentBand && line.match(/^\s*-?\d/)) {
      const parts = line.split(/\s+/).filter(p => p.length > 0);

      if (parts.length >= 3) {
        const energy = parseFloat(parts[0]);
        const atomIdx = parseInt(parts[1], 10);
        const weights = parts.slice(2).map(p => parseFloat(p));

        if (!isNaN(energy) && !isNaN(atomIdx)) {
          // Convert energy from Rydberg to eV and subtract Fermi level
          const energyEv = energy * RY_TO_EV - fermiEnergy;

          // Find or create the band point for this k-point
          let bandPoint = currentBand.points.find(p => p.kPointIndex === kPointIdx);

          if (!bandPoint) {
            bandPoint = {
              kPointIndex: kPointIdx,
              energy: energyEv,
              atomWeights: [],
            };
            currentBand.points.push(bandPoint);
          }

          // Store weights for this atom (atomIdx is 1-based, but could also have interstitial)
          // We'll use atomIdx - 1 as the array index for atoms 1, 2, etc.
          // Interstitial (if present) usually has higher index
          while (bandPoint.atomWeights.length < atomIdx) {
            bandPoint.atomWeights.push([]);
          }
          bandPoint.atomWeights[atomIdx - 1] = weights;

          // If this is the last atom for this k-point, increment kPointIdx
          if (atomIdx >= numAtoms || (atomIdx === atoms.length && !lines[i + 1]?.match(/^\s*-?\d.*\s+\d+\s+\d/))) {
            // Check if next line is a new k-point (different energy or new atom 1)
            const nextLine = lines[i + 1]?.trim();
            if (nextLine) {
              const nextParts = nextLine.split(/\s+/).filter(p => p.length > 0);
              const nextAtomIdx = nextParts.length >= 2 ? parseInt(nextParts[1], 10) : 0;
              if (nextAtomIdx === 1 || nextLine.match(/^BAND/)) {
                kPointIdx++;
              }
            }
          }
        }
      }
    }
  }

  // Don't forget the last band
  if (currentBand) {
    bands.push(currentBand);
  }

  return {
    caseName,
    latticeConstants,
    fermiEnergy,
    numAtoms,
    spinPolarized,
    spinOrbit,
    atoms,
    bands,
  };
}

/**
 * Parse both .qtl and .klist_band files and combine into BandStructureData
 */
export function parseBandStructure(qtlContent: string, klistContent: string): BandStructureData {
  const { kPoints, highSymmetryIndices } = parseKlistBand(klistContent);
  const qtlData = parseQtl(qtlContent, kPoints);

  return {
    ...qtlData,
    kPoints,
    highSymmetryIndices,
  };
}

/**
 * Calculate cumulative k-path distance for plotting x-axis
 */
export function calculateKPathDistance(kPoints: KPoint[]): number[] {
  const distances: number[] = [0];

  for (let i = 1; i < kPoints.length; i++) {
    const prev = kPoints[i - 1];
    const curr = kPoints[i];

    // Calculate distance in reciprocal space (simple Euclidean)
    const dk = Math.sqrt(
      Math.pow(curr.kx - prev.kx, 2) +
      Math.pow(curr.ky - prev.ky, 2) +
      Math.pow(curr.kz - prev.kz, 2)
    );

    distances.push(distances[i - 1] + dk);
  }

  return distances;
}

/**
 * Get projection weight for a band point
 *
 * @param point - The band point
 * @param atomIndices - Which atoms to include (1-based, or empty for all)
 * @param orbitalIndices - Which orbital indices to sum (or empty for total)
 */
export function getProjectionWeight(
  point: BandPoint,
  atomIndices: number[] = [],
  orbitalIndices: number[] = [0]  // Default to total (index 0)
): number {
  let totalWeight = 0;

  const atomsToSum = atomIndices.length > 0
    ? atomIndices.map(i => i - 1)  // Convert to 0-based
    : point.atomWeights.map((_, i) => i);  // All atoms

  for (const atomIdx of atomsToSum) {
    const weights = point.atomWeights[atomIdx];
    if (weights) {
      for (const orbIdx of orbitalIndices) {
        if (orbIdx < weights.length) {
          totalWeight += weights[orbIdx];
        }
      }
    }
  }

  return totalWeight;
}

/**
 * Get orbital indices for a given orbital type
 */
export function getOrbitalIndices(orbitalType: keyof typeof ORBITAL_GROUPS): number[] {
  const orbitals = ORBITAL_GROUPS[orbitalType];
  return orbitals.map(o => ORBITAL_LABELS.indexOf(o as OrbitalType)).filter(i => i >= 0);
}
