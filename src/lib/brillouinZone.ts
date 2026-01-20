/**
 * Brillouin Zone and High-Symmetry Point Utilities
 *
 * Based on: Hinuma et al. "Band structure diagram paths based on crystallography"
 * Computational Materials Science 128 (2017) 140-184
 *
 * Cross-referenced with Seekpath (https://github.com/giovannipizzi/seekpath)
 */

// Crystal systems derived from space group number
export type CrystalSystem =
  | "triclinic"
  | "monoclinic"
  | "orthorhombic"
  | "tetragonal"
  | "trigonal"
  | "hexagonal"
  | "cubic";

// Bravais lattice types (Pearson symbols)
export type BravaisLattice =
  | "aP"   // Triclinic primitive
  | "mP"   // Monoclinic primitive
  | "mS"   // Monoclinic base-centered (also called mC)
  | "oP"   // Orthorhombic primitive
  | "oS"   // Orthorhombic base-centered
  | "oI"   // Orthorhombic body-centered
  | "oF"   // Orthorhombic face-centered
  | "tP"   // Tetragonal primitive
  | "tI"   // Tetragonal body-centered
  | "hR"   // Trigonal rhombohedral
  | "hP"   // Hexagonal primitive
  | "cP"   // Cubic primitive
  | "cI"   // Cubic body-centered (BCC)
  | "cF"; // Cubic face-centered (FCC)

export interface HighSymmetryPoint {
  label: string;
  coordinates: [number, number, number];
  description?: string;
}

/**
 * Get crystal system from space group number (International Tables)
 */
export function getCrystalSystem(spaceGroupNumber: number): CrystalSystem {
  if (spaceGroupNumber >= 1 && spaceGroupNumber <= 2) return "triclinic";
  if (spaceGroupNumber >= 3 && spaceGroupNumber <= 15) return "monoclinic";
  if (spaceGroupNumber >= 16 && spaceGroupNumber <= 74) return "orthorhombic";
  if (spaceGroupNumber >= 75 && spaceGroupNumber <= 142) return "tetragonal";
  if (spaceGroupNumber >= 143 && spaceGroupNumber <= 167) return "trigonal";
  if (spaceGroupNumber >= 168 && spaceGroupNumber <= 194) return "hexagonal";
  if (spaceGroupNumber >= 195 && spaceGroupNumber <= 230) return "cubic";
  throw new Error(`Invalid space group number: ${spaceGroupNumber}`);
}

/**
 * Get centering type from Hermann-Mauguin symbol
 */
export function getCenteringType(hmSymbol: string): string {
  if (!hmSymbol || hmSymbol.length === 0) return "P";
  const firstChar = hmSymbol.charAt(0).toUpperCase();
  // Valid centering types: P, I, F, A, B, C, R
  if (["P", "I", "F", "A", "B", "C", "R"].includes(firstChar)) {
    return firstChar;
  }
  return "P"; // Default to primitive
}

/**
 * Determine Bravais lattice from space group
 */
export function getBravaisLattice(
  spaceGroupNumber: number,
  hmSymbol?: string
): BravaisLattice {
  const crystalSystem = getCrystalSystem(spaceGroupNumber);
  const centering = hmSymbol ? getCenteringType(hmSymbol) : "P";

  switch (crystalSystem) {
    case "triclinic":
      return "aP";

    case "monoclinic":
      if (centering === "P") return "mP";
      return "mS"; // A, B, C, I all become mS in standard setting

    case "orthorhombic":
      if (centering === "P") return "oP";
      if (centering === "I") return "oI";
      if (centering === "F") return "oF";
      return "oS"; // A, B, C become oS

    case "tetragonal":
      if (centering === "P") return "tP";
      return "tI"; // I centering

    case "trigonal":
      if (centering === "R") return "hR";
      return "hP"; // P centering uses hexagonal cell

    case "hexagonal":
      return "hP";

    case "cubic":
      if (centering === "P") return "cP";
      if (centering === "I") return "cI";
      if (centering === "F") return "cF";
      return "cP";

    default:
      return "aP";
  }
}

/**
 * High-symmetry points for each Bravais lattice
 * Coordinates are in fractional reciprocal lattice units
 *
 * Sources:
 * - Hinuma et al. Comp. Mat. Sci. 128 (2017) 140-184
 * - Setyawan & Curtarolo, Comp. Mat. Sci. 49 (2010) 299-312
 */
const HIGH_SYMMETRY_POINTS: Record<BravaisLattice, HighSymmetryPoint[]> = {
  // Cubic face-centered (FCC)
  cF: [
    { label: "Γ", coordinates: [0, 0, 0], description: "Gamma - zone center" },
    { label: "X", coordinates: [0.5, 0, 0.5], description: "Zone face center" },
    { label: "L", coordinates: [0.5, 0.5, 0.5], description: "Zone corner" },
    { label: "W", coordinates: [0.5, 0.25, 0.75], description: "Zone edge center" },
    { label: "U", coordinates: [0.625, 0.25, 0.625] },
    { label: "K", coordinates: [0.375, 0.375, 0.75] },
  ],

  // Cubic body-centered (BCC)
  cI: [
    { label: "Γ", coordinates: [0, 0, 0], description: "Gamma - zone center" },
    { label: "H", coordinates: [0.5, -0.5, 0.5] },
    { label: "P", coordinates: [0.25, 0.25, 0.25] },
    { label: "N", coordinates: [0, 0, 0.5] },
  ],

  // Cubic primitive (simple cubic)
  cP: [
    { label: "Γ", coordinates: [0, 0, 0], description: "Gamma - zone center" },
    { label: "X", coordinates: [0, 0.5, 0] },
    { label: "M", coordinates: [0.5, 0.5, 0] },
    { label: "R", coordinates: [0.5, 0.5, 0.5] },
  ],

  // Hexagonal primitive
  hP: [
    { label: "Γ", coordinates: [0, 0, 0], description: "Gamma - zone center" },
    { label: "A", coordinates: [0, 0, 0.5] },
    { label: "K", coordinates: [1/3, 1/3, 0] },
    { label: "H", coordinates: [1/3, 1/3, 0.5] },
    { label: "M", coordinates: [0.5, 0, 0] },
    { label: "L", coordinates: [0.5, 0, 0.5] },
  ],

  // Trigonal rhombohedral (using hexagonal axes)
  hR: [
    { label: "Γ", coordinates: [0, 0, 0], description: "Gamma - zone center" },
    { label: "T", coordinates: [0.5, 0.5, 0.5] },
    { label: "L", coordinates: [0.5, 0, 0] },
    { label: "F", coordinates: [0.5, 0.5, 0] },
  ],

  // Tetragonal primitive
  tP: [
    { label: "Γ", coordinates: [0, 0, 0], description: "Gamma - zone center" },
    { label: "X", coordinates: [0.5, 0, 0] },
    { label: "M", coordinates: [0.5, 0.5, 0] },
    { label: "Z", coordinates: [0, 0, 0.5] },
    { label: "R", coordinates: [0.5, 0, 0.5] },
    { label: "A", coordinates: [0.5, 0.5, 0.5] },
  ],

  // Tetragonal body-centered
  tI: [
    { label: "Γ", coordinates: [0, 0, 0], description: "Gamma - zone center" },
    { label: "X", coordinates: [0, 0, 0.5] },
    { label: "M", coordinates: [-0.5, 0.5, 0.5] },
    { label: "N", coordinates: [0, 0.5, 0] },
    { label: "P", coordinates: [0.25, 0.25, 0.25] },
  ],

  // Orthorhombic primitive
  oP: [
    { label: "Γ", coordinates: [0, 0, 0], description: "Gamma - zone center" },
    { label: "X", coordinates: [0.5, 0, 0] },
    { label: "Y", coordinates: [0, 0.5, 0] },
    { label: "Z", coordinates: [0, 0, 0.5] },
    { label: "S", coordinates: [0.5, 0.5, 0] },
    { label: "R", coordinates: [0.5, 0.5, 0.5] },
    { label: "T", coordinates: [0, 0.5, 0.5] },
    { label: "U", coordinates: [0.5, 0, 0.5] },
  ],

  // Orthorhombic base-centered
  oS: [
    { label: "Γ", coordinates: [0, 0, 0], description: "Gamma - zone center" },
    { label: "X", coordinates: [0.5, 0.5, 0] },
    { label: "Y", coordinates: [-0.5, 0.5, 0] },
    { label: "Z", coordinates: [0, 0, 0.5] },
    { label: "S", coordinates: [0, 0.5, 0] },
    { label: "R", coordinates: [0, 0.5, 0.5] },
    { label: "T", coordinates: [-0.5, 0.5, 0.5] },
  ],

  // Orthorhombic body-centered
  oI: [
    { label: "Γ", coordinates: [0, 0, 0], description: "Gamma - zone center" },
    { label: "X", coordinates: [0.5, 0.5, -0.5] },
    { label: "L", coordinates: [0.5, 0.5, 0] },
    { label: "T", coordinates: [1, 0.5, 0] },
    { label: "W", coordinates: [0.75, 0.5, 0.25] },
    { label: "R", coordinates: [0.5, 0.5, 0.5] },
  ],

  // Orthorhombic face-centered
  oF: [
    { label: "Γ", coordinates: [0, 0, 0], description: "Gamma - zone center" },
    { label: "X", coordinates: [0.5, 0, 0.5] },
    { label: "Y", coordinates: [0.5, 0.5, 0] },
    { label: "Z", coordinates: [0, 0.5, 0.5] },
    { label: "L", coordinates: [0.5, 0.5, 0.5] },
    { label: "T", coordinates: [1, 0.5, 0.5] },
  ],

  // Monoclinic primitive
  mP: [
    { label: "Γ", coordinates: [0, 0, 0], description: "Gamma - zone center" },
    { label: "Z", coordinates: [0, 0.5, 0] },
    { label: "B", coordinates: [0, 0, 0.5] },
    { label: "Y", coordinates: [0.5, 0, 0] },
    { label: "D", coordinates: [0, 0.5, 0.5] },
    { label: "C", coordinates: [0.5, 0, 0.5] },
    { label: "A", coordinates: [0.5, 0.5, 0] },
    { label: "E", coordinates: [0.5, 0.5, 0.5] },
  ],

  // Monoclinic base-centered
  mS: [
    { label: "Γ", coordinates: [0, 0, 0], description: "Gamma - zone center" },
    { label: "Y", coordinates: [0.5, 0.5, 0] },
    { label: "A", coordinates: [0, 0, 0.5] },
    { label: "M", coordinates: [0.5, 0.5, 0.5] },
  ],

  // Triclinic primitive
  aP: [
    { label: "Γ", coordinates: [0, 0, 0], description: "Gamma - zone center" },
    { label: "X", coordinates: [0.5, 0, 0] },
    { label: "Y", coordinates: [0, 0.5, 0] },
    { label: "Z", coordinates: [0, 0, 0.5] },
    { label: "R", coordinates: [0.5, 0.5, 0.5] },
  ],
};

/**
 * Get high-symmetry points for a given Bravais lattice
 */
export function getHighSymmetryPoints(bravaisLattice: BravaisLattice): HighSymmetryPoint[] {
  return HIGH_SYMMETRY_POINTS[bravaisLattice] || [];
}

/**
 * Match a k-point coordinate to a known high-symmetry point
 * Returns the label if found, undefined otherwise
 *
 * @param kx - k-point x coordinate (fractional)
 * @param ky - k-point y coordinate (fractional)
 * @param kz - k-point z coordinate (fractional)
 * @param bravaisLattice - The Bravais lattice type
 * @param tolerance - Matching tolerance (default 0.001)
 */
export function matchHighSymmetryPoint(
  kx: number,
  ky: number,
  kz: number,
  bravaisLattice: BravaisLattice,
  tolerance: number = 0.001
): string | undefined {
  const points = getHighSymmetryPoints(bravaisLattice);

  for (const point of points) {
    const [px, py, pz] = point.coordinates;

    // Check if coordinates match within tolerance
    // Also check equivalent points (shifted by reciprocal lattice vectors)
    if (coordinatesMatch(kx, ky, kz, px, py, pz, tolerance)) {
      return point.label;
    }
  }

  return undefined;
}

/**
 * Check if two k-point coordinates match, accounting for periodicity
 */
function coordinatesMatch(
  kx: number, ky: number, kz: number,
  px: number, py: number, pz: number,
  tolerance: number
): boolean {
  // Normalize coordinates to [0, 1) range for comparison
  const normalize = (v: number) => {
    let n = v % 1;
    if (n < 0) n += 1;
    if (Math.abs(n - 1) < tolerance) n = 0;
    return n;
  };

  const nkx = normalize(kx);
  const nky = normalize(ky);
  const nkz = normalize(kz);
  const npx = normalize(px);
  const npy = normalize(py);
  const npz = normalize(pz);

  const dx = Math.abs(nkx - npx);
  const dy = Math.abs(nky - npy);
  const dz = Math.abs(nkz - npz);

  // Check with tolerance, also accounting for wrap-around at boundaries
  const matchesX = dx < tolerance || Math.abs(dx - 1) < tolerance;
  const matchesY = dy < tolerance || Math.abs(dy - 1) < tolerance;
  const matchesZ = dz < tolerance || Math.abs(dz - 1) < tolerance;

  return matchesX && matchesY && matchesZ;
}

/**
 * Auto-detect labels for all high-symmetry k-points in a band structure
 *
 * @param kPoints - Array of k-point coordinates [{kx, ky, kz}, ...]
 * @param highSymmetryIndices - Indices of high-symmetry points in the kPoints array
 * @param bravaisLattice - The Bravais lattice type
 * @returns Record mapping original label (e.g., "K.1") to detected label (e.g., "Γ")
 */
export function autoDetectKPointLabels(
  kPoints: Array<{ kx: number; ky: number; kz: number; label?: string }>,
  highSymmetryIndices: number[],
  bravaisLattice: BravaisLattice
): Record<string, string> {
  const labels: Record<string, string> = {};

  for (const idx of highSymmetryIndices) {
    const kPoint = kPoints[idx];
    if (!kPoint) continue;

    const originalLabel = kPoint.label || `K${idx}`;
    const detectedLabel = matchHighSymmetryPoint(
      kPoint.kx,
      kPoint.ky,
      kPoint.kz,
      bravaisLattice
    );

    if (detectedLabel) {
      labels[originalLabel] = detectedLabel;
    }
  }

  return labels;
}

/**
 * Get a human-readable name for a Bravais lattice
 */
export function getBravaisLatticeName(bravaisLattice: BravaisLattice): string {
  const names: Record<BravaisLattice, string> = {
    aP: "Triclinic primitive",
    mP: "Monoclinic primitive",
    mS: "Monoclinic base-centered",
    oP: "Orthorhombic primitive",
    oS: "Orthorhombic base-centered",
    oI: "Orthorhombic body-centered",
    oF: "Orthorhombic face-centered",
    tP: "Tetragonal primitive",
    tI: "Tetragonal body-centered",
    hR: "Trigonal rhombohedral",
    hP: "Hexagonal primitive",
    cP: "Cubic primitive (simple cubic)",
    cI: "Cubic body-centered (BCC)",
    cF: "Cubic face-centered (FCC)",
  };
  return names[bravaisLattice] || bravaisLattice;
}
