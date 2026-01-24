/**
 * Wien2k Fermi Surface File Parsers
 *
 * Parses Wien2k output files to extract data needed for Fermi surface visualization:
 * - case.klist: K-point mesh (irreducible BZ)
 * - case.energyso / case.energy: Eigenvalues at k-points
 * - case.scf: Fermi energy
 * - case.struct: Symmetry operations and lattice parameters
 */

// Rydberg to eV conversion factor
const RY_TO_EV = 13.605693122994;

export interface KPoint {
  kx: number;
  ky: number;
  kz: number;
  weight: number;
}

export interface IrreducibleKPoint extends KPoint {
  energies: number[]; // in eV
}

export interface SymmetryMatrix {
  rotation: number[][]; // 3x3
  translation: number[]; // 3
}

export interface LatticeParameters {
  a: number;
  b: number;
  c: number;
  alpha: number; // in radians
  beta: number;
  gamma: number;
}

export interface FermiSurfaceRawData {
  fermiEnergy: number; // eV
  kPoints: IrreducibleKPoint[];
  numBands: number;
  symmetryOps: SymmetryMatrix[];
  latticeParams: LatticeParameters;
  gridSize: number; // from klist (e.g., 10 for 10x10x10)
  caseName: string;
}

export interface KlistParseResult {
  kPoints: KPoint[];
  gridSize: number;
  totalKPoints: number;
}

/**
 * Parse case.klist file
 * Format:
 *   index  kx*div  ky*div  kz*div  div  weight  [optional extra info on first line]
 */
export function parseKlist(content: string): KlistParseResult {
  const lines = content.split('\n');
  const kPoints: KPoint[] = [];
  let gridSize = 10; // default
  let totalKPoints = 1000; // default

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === 'END') continue;

    // Parse line - handle fixed-width format
    // Example: "     1         0         0         0        10  1.0 -7.0  1.5      1000 k, div: ( 10 10 10)"
    // Or:      "     2         1         1        -1        10  8.0"
    const parts = trimmed.split(/\s+/);
    if (parts.length < 6) continue;

    // Try to parse as k-point data
    const index = parseInt(parts[0], 10);
    const kxTimesDiv = parseInt(parts[1], 10);
    const kyTimesDiv = parseInt(parts[2], 10);
    const kzTimesDiv = parseInt(parts[3], 10);
    const div = parseInt(parts[4], 10);
    const weight = parseFloat(parts[5]);

    if (isNaN(index) || isNaN(kxTimesDiv) || isNaN(div) || isNaN(weight)) continue;

    // First line may contain grid info: "k, div: ( 10 10 10)"
    if (index === 1) {
      const divMatch = trimmed.match(/div:\s*\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\)/);
      if (divMatch) {
        gridSize = parseInt(divMatch[1], 10);
      }
      const totalMatch = trimmed.match(/(\d+)\s+k,/);
      if (totalMatch) {
        totalKPoints = parseInt(totalMatch[1], 10);
      }
    }

    // Convert to fractional coordinates
    const kx = kxTimesDiv / div;
    const ky = kyTimesDiv / div;
    const kz = kzTimesDiv / div;

    kPoints.push({ kx, ky, kz, weight });
  }

  return { kPoints, gridSize, totalKPoints };
}

/**
 * Parse case.energy or case.energyso file
 * Format:
 *   [4 header lines for energyso, 0 for energy]
 *   kx ky kz index numPWs numBands weight
 *   bandIndex energy_in_Rydberg
 *   ...
 */
export function parseEnergy(content: string, isSOC: boolean = true): IrreducibleKPoint[] {
  const lines = content.split('\n');
  const kPoints: IrreducibleKPoint[] = [];

  let i = 0;

  // Skip header lines for SOC (4 lines)
  if (isSOC) {
    i = 4;
  }

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }

    // Try to parse as k-point header
    // Format: "kx ky kz index numPWs numBands weight"
    // Example: " 0.000000000000E+00 0.000000000000E+00 0.000000000000E+00         1   208    66  1.0"
    const kHeaderMatch = line.match(
      /^\s*([-\d.E+]+)\s+([-\d.E+]+)\s+([-\d.E+]+)\s+(\d+)\s+(\d+)\s+(\d+)\s+([\d.]+)/i
    );

    if (kHeaderMatch) {
      const kx = parseFloat(kHeaderMatch[1]);
      const ky = parseFloat(kHeaderMatch[2]);
      const kz = parseFloat(kHeaderMatch[3]);
      const numBands = parseInt(kHeaderMatch[6], 10);
      const weight = parseFloat(kHeaderMatch[7]);

      const energies: number[] = [];

      // Read band energies
      for (let b = 0; b < numBands; b++) {
        i++;
        if (i >= lines.length) break;

        const bandLine = lines[i].trim();
        const bandMatch = bandLine.match(/^\s*(\d+)\s+([-\d.E+]+)/i);

        if (bandMatch) {
          const energyRy = parseFloat(bandMatch[2]);
          const energyEv = energyRy * RY_TO_EV;
          energies.push(energyEv);
        }
      }

      kPoints.push({ kx, ky, kz, weight, energies });
    }

    i++;
  }

  return kPoints;
}

/**
 * Parse Fermi energy from case.scf file
 * Looks for line: ":FER  : F E R M I - ENERGY(TETRAH.M.)=   0.4931865487"
 */
export function parseFermiFromScf(content: string): number {
  const lines = content.split('\n');
  let fermiEnergy = 0;

  // Find the last :FER line (converged value)
  for (const line of lines) {
    const match = line.match(/:FER\s*:\s*F\s*E\s*R\s*M\s*I.*?=\s*([-\d.]+)/i);
    if (match) {
      fermiEnergy = parseFloat(match[1]);
    }
  }

  // Convert from Rydberg to eV
  return fermiEnergy * RY_TO_EV;
}

/**
 * Parse symmetry operations and lattice parameters from case.struct file
 */
export function parseStruct(content: string): {
  symmetryOps: SymmetryMatrix[];
  latticeParams: LatticeParameters;
} {
  const lines = content.split('\n');
  const symmetryOps: SymmetryMatrix[] = [];
  let latticeParams: LatticeParameters = {
    a: 1, b: 1, c: 1,
    alpha: Math.PI / 2, beta: Math.PI / 2, gamma: Math.PI / 2
  };

  let i = 0;
  let numSymOps = 0;
  let symStartLine = -1;

  while (i < lines.length) {
    const line = lines[i];

    // Parse lattice parameters (line 4, 0-indexed line 3)
    // Format: " 12.281335 12.281335 12.281335 90.000000 90.000000 90.000000"
    if (i === 3) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 6) {
        latticeParams = {
          a: parseFloat(parts[0]),
          b: parseFloat(parts[1]),
          c: parseFloat(parts[2]),
          alpha: parseFloat(parts[3]) * Math.PI / 180, // degrees to radians
          beta: parseFloat(parts[4]) * Math.PI / 180,
          gamma: parseFloat(parts[5]) * Math.PI / 180
        };
      }
    }

    // Find "NUMBER OF SYMMETRY OPERATIONS" line
    const symMatch = line.match(/(\d+)\s+NUMBER OF SYMMETRY OPERATIONS/i);
    if (symMatch) {
      numSymOps = parseInt(symMatch[1], 10);
      symStartLine = i + 1;
      break;
    }

    i++;
  }

  // Parse symmetry operations
  // Format: 3 lines of rotation matrix (each row), then 1 line with operation index
  // " 1 0 0 0.00000000"
  // " 0-1 0 0.00000000"
  // " 0 0-1 0.00000000"
  // "       1"
  if (symStartLine >= 0) {
    for (let s = 0; s < numSymOps; s++) {
      const baseIdx = symStartLine + s * 4;
      if (baseIdx + 3 >= lines.length) break;

      const rotation: number[][] = [];
      const translation: number[] = [];

      for (let row = 0; row < 3; row++) {
        const rowLine = lines[baseIdx + row];
        // Parse rotation row and translation component
        // Handle formats like " 1 0 0 0.00000000" or " 0-1 0 0.00000000" (no space between - and digit)
        const rowParts = parseSymmetryRow(rowLine);
        if (rowParts) {
          rotation.push([rowParts.r1, rowParts.r2, rowParts.r3]);
          translation.push(rowParts.t);
        }
      }

      if (rotation.length === 3) {
        symmetryOps.push({ rotation, translation });
      }
    }
  }

  return { symmetryOps, latticeParams };
}

/**
 * Helper to parse a symmetry matrix row
 * Handles formats like " 1 0 0 0.00000000" or " 0-1 0 0.00000000"
 */
function parseSymmetryRow(line: string): { r1: number; r2: number; r3: number; t: number } | null {
  // First, try to extract the translation (last number with decimal)
  const parts = line.trim().split(/\s+/);
  if (parts.length < 1) return null;

  // The last part is always the translation
  const translation = parseFloat(parts[parts.length - 1]);

  // The rotation part is everything before the translation
  // We need to handle cases like "0-1 0" which is "0, -1, 0"
  const rotPart = parts.slice(0, -1).join(' ');

  // Parse rotation values - handle concatenated negative signs
  const rotMatch = rotPart.match(/([-]?\d)([-]?\d)([-]?\d)/);
  if (rotMatch) {
    return {
      r1: parseInt(rotMatch[1], 10),
      r2: parseInt(rotMatch[2], 10),
      r3: parseInt(rotMatch[3], 10),
      t: translation
    };
  }

  // Try space-separated format
  const rotParts = rotPart.split(/\s+/).filter(p => p);
  if (rotParts.length >= 3) {
    return {
      r1: parseInt(rotParts[0], 10),
      r2: parseInt(rotParts[1], 10),
      r3: parseInt(rotParts[2], 10),
      t: translation
    };
  }

  return null;
}

/**
 * Main entry point: Parse all Wien2k files and return combined data
 */
export function parseWien2kFermiData(
  klist: string,
  energy: string,
  scf: string,
  struct: string,
  caseName: string,
  isSOC: boolean = true
): FermiSurfaceRawData {
  // Parse individual files
  const klistResult = parseKlist(klist);
  const energyKPoints = parseEnergy(energy, isSOC);
  const fermiEnergy = parseFermiFromScf(scf);
  const { symmetryOps, latticeParams } = parseStruct(struct);

  // Match energies to k-points
  // The order in klist and energy files should match
  const kPoints: IrreducibleKPoint[] = klistResult.kPoints.map((kp, index) => {
    const energyData = energyKPoints[index];
    return {
      ...kp,
      energies: energyData?.energies || []
    };
  });

  // Determine number of bands
  const numBands = kPoints.length > 0 ? kPoints[0].energies.length : 0;

  return {
    fermiEnergy,
    kPoints,
    numBands,
    symmetryOps,
    latticeParams,
    gridSize: klistResult.gridSize,
    caseName
  };
}

/**
 * Auto-detect file type from content
 */
export function detectFileType(content: string, filename: string):
  'klist' | 'energy' | 'energyso' | 'scf' | 'struct' | 'unknown' {

  const lower = filename.toLowerCase();

  // Check by extension first
  if (lower.endsWith('.klist')) return 'klist';
  if (lower.endsWith('.energyso') || lower.endsWith('.energysodn') || lower.endsWith('.energysoup')) return 'energyso';
  if (lower.endsWith('.energy') || lower.endsWith('.energyup') || lower.endsWith('.energydn')) return 'energy';
  if (lower.match(/\.scf\d*$/) || lower.endsWith('.scfso')) return 'scf';
  if (lower.endsWith('.struct') && !lower.includes('_nn') && !lower.includes('_st')) return 'struct';

  // Check by content
  if (content.includes(':FER')) return 'scf';
  if (content.includes('NUMBER OF SYMMETRY OPERATIONS')) return 'struct';
  if (content.includes('END') && content.match(/\d+\s+\d+\s+\d+\s+\d+\s+\d+/)) return 'klist';
  if (content.match(/\d+\s+[-\d.E+]+\s*$/m)) {
    // Could be energy file - check for k-point header pattern
    if (content.match(/[-\d.E+]+\s+[-\d.E+]+\s+[-\d.E+]+\s+\d+\s+\d+\s+\d+/)) {
      return 'energyso'; // Assume SOC by default
    }
  }

  return 'unknown';
}

/**
 * Extract case name from Wien2k filename
 * e.g., "LaSb_try3.klist" -> "LaSb_try3"
 */
export function extractCaseName(filename: string): string {
  // Remove common extensions
  const extensions = [
    '.klist', '.energy', '.energyup', '.energydn', '.energyso', '.energysodn', '.energysoup',
    '.scf', '.scf0', '.scf1', '.scf2', '.scfc', '.scfm', '.scfq', '.scfso',
    '.struct', '.struct_ii', '.struct_nn', '.struct_st'
  ];

  let name = filename;
  for (const ext of extensions) {
    if (name.toLowerCase().endsWith(ext)) {
      name = name.slice(0, -ext.length);
      break;
    }
  }

  return name;
}

/**
 * Find bands that cross the Fermi level
 */
export function findFermiCrossingBands(data: FermiSurfaceRawData): number[] {
  const crossingBands: number[] = [];
  const { fermiEnergy, kPoints, numBands } = data;

  for (let bandIdx = 0; bandIdx < numBands; bandIdx++) {
    let hasAbove = false;
    let hasBelow = false;

    for (const kp of kPoints) {
      if (kp.energies[bandIdx] !== undefined) {
        if (kp.energies[bandIdx] > fermiEnergy) hasAbove = true;
        if (kp.energies[bandIdx] < fermiEnergy) hasBelow = true;
        if (hasAbove && hasBelow) break;
      }
    }

    if (hasAbove && hasBelow) {
      crossingBands.push(bandIdx);
    }
  }

  return crossingBands;
}
