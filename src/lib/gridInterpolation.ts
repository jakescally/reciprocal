/**
 * Grid Interpolation for Fermi Surface Calculation
 *
 * Builds a regular 3D grid of energy values from scattered k-points
 * using trilinear interpolation.
 */

import {
  ExpandedKPoint,
  buildKPointLookupMap,
  findInterpolationCube,
  findNearestKPoint
} from './kpointSymmetry';

export interface EnergyGrid {
  nx: number;
  ny: number;
  nz: number;
  data: Float32Array[]; // One array per band
  fermiEnergy: number;
  // Grid spans [-0.5, 0.5) in each dimension (first Brillouin zone)
}

/**
 * Interpolate energy at a given point using the surrounding k-points
 */
function interpolateEnergy(
  corners: (ExpandedKPoint | null)[],
  weights: number[],
  bandIndex: number
): number | null {
  let result = 0;
  let totalWeight = 0;

  for (let i = 0; i < 8; i++) {
    const corner = corners[i];
    if (corner && corner.energies[bandIndex] !== undefined) {
      result += corner.energies[bandIndex] * weights[i];
      totalWeight += weights[i];
    }
  }

  if (totalWeight === 0) return null;
  return result / totalWeight;
}

/**
 * Build a regular energy grid from expanded k-points
 *
 * @param expandedKPoints K-points expanded to full BZ
 * @param gridSize Number of grid points in each dimension (default 32)
 * @param bandIndices Which bands to include (empty = all bands)
 * @param fermiEnergy Fermi energy in eV
 * @param sourceGridSize Original k-point grid size from Wien2k
 */
export function buildEnergyGrid(
  expandedKPoints: ExpandedKPoint[],
  gridSize: number = 32,
  bandIndices: number[] = [],
  fermiEnergy: number = 0,
  sourceGridSize: number = 10
): EnergyGrid {
  // Determine which bands to include
  const numBands = expandedKPoints.length > 0 ? expandedKPoints[0].energies.length : 0;
  const bands = bandIndices.length > 0 ? bandIndices : Array.from({ length: numBands }, (_, i) => i);

  // Build lookup map for fast k-point access
  const kpLookup = buildKPointLookupMap(expandedKPoints, sourceGridSize);

  // Initialize grid arrays
  const data: Float32Array[] = bands.map(() => new Float32Array(gridSize * gridSize * gridSize));

  // Fill the grid
  for (let iz = 0; iz < gridSize; iz++) {
    for (let iy = 0; iy < gridSize; iy++) {
      for (let ix = 0; ix < gridSize; ix++) {
        // Convert grid indices to k-space coordinates [-0.5, 0.5)
        const kx = (ix / gridSize) - 0.5;
        const ky = (iy / gridSize) - 0.5;
        const kz = (iz / gridSize) - 0.5;

        // Find interpolation cube (8 nearest k-points)
        const { corners, weights } = findInterpolationCube(kx, ky, kz, kpLookup, sourceGridSize);

        // Calculate grid array index
        const gridIdx = ix + iy * gridSize + iz * gridSize * gridSize;

        // Interpolate energy for each band
        for (let b = 0; b < bands.length; b++) {
          const bandIdx = bands[b];
          const energy = interpolateEnergy(corners, weights, bandIdx);

          if (energy !== null) {
            data[b][gridIdx] = energy;
          } else {
            // Fallback: use nearest k-point
            const nearest = findNearestKPoint(kx, ky, kz, expandedKPoints);
            if (nearest && nearest.energies[bandIdx] !== undefined) {
              data[b][gridIdx] = nearest.energies[bandIdx];
            }
          }
        }
      }
    }
  }

  return {
    nx: gridSize,
    ny: gridSize,
    nz: gridSize,
    data,
    fermiEnergy
  };
}

/**
 * Get energy value at a specific grid point
 */
export function getGridValue(
  grid: EnergyGrid,
  bandArrayIndex: number,
  ix: number,
  iy: number,
  iz: number
): number {
  const { nx, ny, nz, data } = grid;

  // Handle periodic boundaries
  const px = ((ix % nx) + nx) % nx;
  const py = ((iy % ny) + ny) % ny;
  const pz = ((iz % nz) + nz) % nz;

  const idx = px + py * nx + pz * nx * ny;
  return data[bandArrayIndex][idx];
}

/**
 * Sample energy at arbitrary k-point using trilinear interpolation on the grid
 */
export function sampleGridEnergy(
  grid: EnergyGrid,
  bandArrayIndex: number,
  kx: number,
  ky: number,
  kz: number
): number {
  const { nx, ny, nz } = grid;

  // Convert k-space to grid coordinates
  // k in [-0.5, 0.5) -> grid in [0, n)
  const gx = (kx + 0.5) * nx;
  const gy = (ky + 0.5) * ny;
  const gz = (kz + 0.5) * nz;

  // Get lower corner indices
  const ix0 = Math.floor(gx);
  const iy0 = Math.floor(gy);
  const iz0 = Math.floor(gz);

  // Fractional positions
  const fx = gx - ix0;
  const fy = gy - iy0;
  const fz = gz - iz0;

  // Get 8 corner values
  const v000 = getGridValue(grid, bandArrayIndex, ix0, iy0, iz0);
  const v100 = getGridValue(grid, bandArrayIndex, ix0 + 1, iy0, iz0);
  const v010 = getGridValue(grid, bandArrayIndex, ix0, iy0 + 1, iz0);
  const v110 = getGridValue(grid, bandArrayIndex, ix0 + 1, iy0 + 1, iz0);
  const v001 = getGridValue(grid, bandArrayIndex, ix0, iy0, iz0 + 1);
  const v101 = getGridValue(grid, bandArrayIndex, ix0 + 1, iy0, iz0 + 1);
  const v011 = getGridValue(grid, bandArrayIndex, ix0, iy0 + 1, iz0 + 1);
  const v111 = getGridValue(grid, bandArrayIndex, ix0 + 1, iy0 + 1, iz0 + 1);

  // Trilinear interpolation
  const v00 = v000 * (1 - fx) + v100 * fx;
  const v01 = v001 * (1 - fx) + v101 * fx;
  const v10 = v010 * (1 - fx) + v110 * fx;
  const v11 = v011 * (1 - fx) + v111 * fx;

  const v0 = v00 * (1 - fy) + v10 * fy;
  const v1 = v01 * (1 - fy) + v11 * fy;

  return v0 * (1 - fz) + v1 * fz;
}

/**
 * Shift grid values relative to Fermi energy
 * After this, isosurface at 0 = Fermi surface
 */
export function shiftToFermiLevel(grid: EnergyGrid): EnergyGrid {
  const newData = grid.data.map(bandData => {
    const shifted = new Float32Array(bandData.length);
    for (let i = 0; i < bandData.length; i++) {
      shifted[i] = bandData[i] - grid.fermiEnergy;
    }
    return shifted;
  });

  return {
    ...grid,
    data: newData,
    fermiEnergy: 0 // After shifting, Fermi level is at 0
  };
}

/**
 * Calculate the gradient of the energy at a grid point
 * Used for computing normals to the Fermi surface
 */
export function calculateGradient(
  grid: EnergyGrid,
  bandArrayIndex: number,
  ix: number,
  iy: number,
  iz: number
): [number, number, number] {
  const { nx, ny, nz } = grid;

  // Central differences with periodic boundaries
  const dx = (getGridValue(grid, bandArrayIndex, ix + 1, iy, iz) -
              getGridValue(grid, bandArrayIndex, ix - 1, iy, iz)) / (2.0 / nx);

  const dy = (getGridValue(grid, bandArrayIndex, ix, iy + 1, iz) -
              getGridValue(grid, bandArrayIndex, ix, iy - 1, iz)) / (2.0 / ny);

  const dz = (getGridValue(grid, bandArrayIndex, ix, iy, iz + 1) -
              getGridValue(grid, bandArrayIndex, ix, iy, iz - 1)) / (2.0 / nz);

  return [dx, dy, dz];
}

/**
 * Normalize a vector
 */
export function normalize(v: [number, number, number]): [number, number, number] {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (len === 0) return [0, 0, 1];
  return [v[0] / len, v[1] / len, v[2] / len];
}
