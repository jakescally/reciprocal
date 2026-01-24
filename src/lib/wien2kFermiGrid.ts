/**
 * Wien2k Fermi Surface Grid Builder (Xcrysden-style)
 *
 * Uses case.output1 + case.output2 + case.outputkgen to build a full 3D band grid.
 * This mirrors Xcrysden's wn_readbands + wn_readbakgen pipeline.
 */

import { EnergyGrid } from "./gridInterpolation";

const RY_TO_EV = 13.605693122994;

export interface Wien2kBandGrid {
  grid: EnergyGrid;
  numBands: number;
  irreducibleKPoints: number;
  reciprocalVectors: number[][];
  caseName: string;
  energiesByKPoint: number[][];
}

type Output1Data = {
  energiesByKPoint: number[][];
  numBands: number;
};

type OutputkgenData = {
  nx: number;
  ny: number;
  nz: number;
  reciprocalVectors: number[][];
  entries: Array<{ x: number; y: number; z: number; relation: number }>;
};

export function parseFermiFromOutput2(content: string): number {
  const lines = content.split("\n");
  let fermiEnergy = 0;
  for (const line of lines) {
    const match = line.match(/:FER\s*:\s*F\s*E\s*R\s*M\s*I.*?=\s*([-\d.]+)/i);
    if (match) {
      fermiEnergy = parseFloat(match[1]);
    }
  }
  return fermiEnergy * RY_TO_EV;
}

export function parseOutput1(content: string): Output1Data {
  const lines = content.split("\n");
  const energiesByKPoint: number[][] = [];
  let current: number[] | null = null;
  let inEnergies = false;

  for (const line of lines) {
    if (line.match(/^\s*K=/)) {
      if (current && current.length > 0) {
        energiesByKPoint.push(current);
      }
      current = [];
      inEnergies = false;
      continue;
    }

    if (line.includes("EIGENVALUES ARE")) {
      inEnergies = true;
      continue;
    }

    if (line.includes("EIGENVALUES BELOW")) {
      inEnergies = false;
      continue;
    }

    if (inEnergies && current) {
      const matches = line.match(/[-+]?\d*\.?\d+(?:[Ee][+-]?\d+)?/g);
      if (matches) {
        for (const value of matches) {
          const energyRy = parseFloat(value);
          if (!Number.isNaN(energyRy)) {
            current.push(energyRy * RY_TO_EV);
          }
        }
      }
    }
  }

  if (current && current.length > 0) {
    energiesByKPoint.push(current);
  }

  let numBands = 0;
  if (energiesByKPoint.length > 0) {
    numBands = Math.min(...energiesByKPoint.map((kp) => kp.length));
    energiesByKPoint.forEach((kp) => kp.splice(numBands));
  }

  return { energiesByKPoint, numBands };
}

export function parseOutputkgen(content: string): OutputkgenData {
  const lines = content.split("\n");
  let reciprocalVectors: number[][] = [];
  let nx = 0;
  let ny = 0;
  let nz = 0;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.match(/\bG1\b\s+G2\s+G3/)) {
      const vec1 = parseFloatLine(lines[i + 1]);
      const vec2 = parseFloatLine(lines[i + 2]);
      const vec3 = parseFloatLine(lines[i + 3]);
      if (vec1.length === 3 && vec2.length === 3 && vec3.length === 3) {
        reciprocalVectors = [vec1, vec2, vec3];
        break;
      }
    }
    i++;
  }

  for (const line of lines) {
    if (line.includes("DIVISION OF RECIPROCAL LATTICE VECTORS")) {
      const ints = parseIntLine(line);
      if (ints.length >= 3) {
        nx = ints[ints.length - 3] + 1;
        ny = ints[ints.length - 2] + 1;
        nz = ints[ints.length - 1] + 1;
      }
      break;
    }
  }

  if (!nx || !ny || !nz) {
    throw new Error("Failed to parse mesh dimensions from outputkgen.");
  }

  const entries: Array<{ x: number; y: number; z: number; relation: number }> = [];
  let headerIndex = lines.findIndex((line) => line.includes("point") && line.includes("coordinates") && line.includes("relation"));
  if (headerIndex < 0) {
    headerIndex = lines.findIndex((line) => line.trim().startsWith("point"));
  }

  const totalPoints = nx * ny * nz;
  let cursor = headerIndex >= 0 ? headerIndex + 1 : 0;
  while (cursor < lines.length && entries.length < totalPoints) {
    const line = lines[cursor].trim();
    if (line) {
      const parts = line.split(/\s+/).map((value) => Number(value));
      if (parts.length >= 5 && parts.every((value) => !Number.isNaN(value))) {
        entries.push({
          x: parts[1],
          y: parts[2],
          z: parts[3],
          relation: parts[4],
        });
      }
    }
    cursor++;
  }

  if (entries.length < totalPoints) {
    throw new Error(`Expected ${totalPoints} k-point entries, got ${entries.length}.`);
  }

  return { nx, ny, nz, reciprocalVectors, entries };
}

export function buildWien2kBandGrid(
  output1: string,
  output2: string,
  outputkgen: string,
  caseName: string
): Wien2kBandGrid {
  const output1Data = parseOutput1(output1);
  const fermiEnergy = parseFermiFromOutput2(output2);
  const outputkgenData = parseOutputkgen(outputkgen);

  const { nx, ny, nz, entries } = outputkgenData;
  const totalPoints = nx * ny * nz;
  const { energiesByKPoint, numBands } = output1Data;

  const data: Float32Array[] = Array.from({ length: numBands }, () => new Float32Array(totalPoints));

  const kIredInd: number[] = new Array(totalPoints + 1);
  entries.forEach((entry, index) => {
    kIredInd[index + 1] = entry.relation;
  });

  const seq2iredInd: number[] = new Array(totalPoints + 1).fill(0);
  let ind2 = 0;
  for (let ind1 = 1; ind1 <= totalPoints; ind1++) {
    if (kIredInd[ind1] === ind1) {
      ind2 += 1;
      seq2iredInd[ind1] = ind2;
    } else {
      const mapped = kIredInd[kIredInd[ind1]];
      seq2iredInd[ind1] = mapped;
    }
  }

  for (let idx = 0; idx < entries.length; idx++) {
    const ind1 = idx + 1;
    const ind2Mapped = kIredInd[ind1];
    const irreducibleIndex = seq2iredInd[ind2Mapped];
    const energies = energiesByKPoint[irreducibleIndex - 1];
    if (!energies) {
      continue;
    }

    const entry = entries[idx];
    const gridIndex = entry.x + entry.y * nx + entry.z * nx * ny;
    for (let b = 0; b < numBands; b++) {
      data[b][gridIndex] = energies[b];
    }
  }

  return {
    grid: {
      nx,
      ny,
      nz,
      data,
      fermiEnergy,
    },
    numBands,
    irreducibleKPoints: energiesByKPoint.length,
    reciprocalVectors: outputkgenData.reciprocalVectors,
    caseName,
    energiesByKPoint,
  };
}

export function findFermiCrossingBandsFromGrid(
  energiesByKPoint: number[][],
  fermiEnergy: number
): number[] {
  if (energiesByKPoint.length === 0) return [];
  const numBands = energiesByKPoint[0].length;
  const crossing: number[] = [];

  for (let bandIdx = 0; bandIdx < numBands; bandIdx++) {
    let hasAbove = false;
    let hasBelow = false;
    for (const kp of energiesByKPoint) {
      const energy = kp[bandIdx];
      if (energy === undefined) continue;
      if (energy > fermiEnergy) hasAbove = true;
      if (energy < fermiEnergy) hasBelow = true;
      if (hasAbove && hasBelow) break;
    }
    if (hasAbove && hasBelow) {
      crossing.push(bandIdx);
    }
  }

  return crossing;
}

export function extractCaseName(filename: string): string {
  const extensions = [
    ".output1",
    ".output2",
    ".outputkgen",
    ".struct",
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

function parseFloatLine(line: string): number[] {
  return line
    .trim()
    .split(/\s+/)
    .map((value) => parseFloat(value))
    .filter((value) => !Number.isNaN(value));
}

function parseIntLine(line: string): number[] {
  return line
    .trim()
    .split(/\s+/)
    .map((value) => parseInt(value, 10))
    .filter((value) => !Number.isNaN(value));
}
