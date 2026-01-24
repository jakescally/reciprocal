/**
 * K-point Symmetry Operations
 *
 * Expands irreducible k-points to the full Brillouin zone using symmetry operations.
 */

import { IrreducibleKPoint, SymmetryMatrix, KPoint } from './wien2kFermiParser';

export interface ExpandedKPoint extends KPoint {
  energies: number[];
  originalIndex: number; // Index of the irreducible k-point this came from
}

/**
 * Apply a symmetry operation to a k-point
 * k' = R * k (translations don't affect k-points in reciprocal space)
 */
export function applySymmetryToKPoint(
  k: { kx: number; ky: number; kz: number },
  symOp: SymmetryMatrix
): { kx: number; ky: number; kz: number } {
  const R = symOp.rotation;

  return {
    kx: R[0][0] * k.kx + R[0][1] * k.ky + R[0][2] * k.kz,
    ky: R[1][0] * k.kx + R[1][1] * k.ky + R[1][2] * k.kz,
    kz: R[2][0] * k.kx + R[2][1] * k.ky + R[2][2] * k.kz
  };
}

/**
 * Wrap a k-point back to the first Brillouin zone [-0.5, 0.5)
 */
function wrapToBZ(k: { kx: number; ky: number; kz: number }): { kx: number; ky: number; kz: number } {
  const wrap = (x: number): number => {
    let result = x;
    while (result >= 0.5) result -= 1.0;
    while (result < -0.5) result += 1.0;
    return result;
  };

  return {
    kx: wrap(k.kx),
    ky: wrap(k.ky),
    kz: wrap(k.kz)
  };
}

/**
 * Check if two k-points are equivalent (within tolerance, considering periodicity)
 */
function kPointsEquivalent(
  k1: { kx: number; ky: number; kz: number },
  k2: { kx: number; ky: number; kz: number },
  tolerance: number = 1e-6
): boolean {
  // Wrap both to BZ first
  const w1 = wrapToBZ(k1);
  const w2 = wrapToBZ(k2);

  // Check direct distance
  const dx = Math.abs(w1.kx - w2.kx);
  const dy = Math.abs(w1.ky - w2.ky);
  const dz = Math.abs(w1.kz - w2.kz);

  // Also check for periodicity at BZ boundaries (e.g., -0.5 and 0.5 are same)
  const dxPeriodic = Math.min(dx, 1.0 - dx);
  const dyPeriodic = Math.min(dy, 1.0 - dy);
  const dzPeriodic = Math.min(dz, 1.0 - dz);

  return dxPeriodic < tolerance && dyPeriodic < tolerance && dzPeriodic < tolerance;
}

/**
 * Expand irreducible k-points to the full Brillouin zone using symmetry operations
 */
export function expandToFullBZ(
  irreducibleKPoints: IrreducibleKPoint[],
  symmetryOps: SymmetryMatrix[],
  tolerance: number = 1e-6
): ExpandedKPoint[] {
  const expandedPoints: ExpandedKPoint[] = [];
  const seenPoints: { kx: number; ky: number; kz: number }[] = [];

  for (let origIdx = 0; origIdx < irreducibleKPoints.length; origIdx++) {
    const kp = irreducibleKPoints[origIdx];

    for (const symOp of symmetryOps) {
      // Apply symmetry operation
      const rotatedK = applySymmetryToKPoint(kp, symOp);
      const wrappedK = wrapToBZ(rotatedK);

      // Check if we've already seen this k-point
      let isDuplicate = false;
      for (const seen of seenPoints) {
        if (kPointsEquivalent(wrappedK, seen, tolerance)) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        seenPoints.push(wrappedK);
        expandedPoints.push({
          kx: wrappedK.kx,
          ky: wrappedK.ky,
          kz: wrappedK.kz,
          weight: 1, // After expansion, each point has equal weight
          energies: [...kp.energies], // Copy energies from original
          originalIndex: origIdx
        });
      }
    }
  }

  return expandedPoints;
}

/**
 * Remove duplicate k-points considering periodicity
 */
export function removeDuplicateKPoints(
  kPoints: ExpandedKPoint[],
  tolerance: number = 1e-6
): ExpandedKPoint[] {
  const unique: ExpandedKPoint[] = [];

  for (const kp of kPoints) {
    let isDuplicate = false;
    for (const u of unique) {
      if (kPointsEquivalent(kp, u, tolerance)) {
        isDuplicate = true;
        break;
      }
    }
    if (!isDuplicate) {
      unique.push(kp);
    }
  }

  return unique;
}

/**
 * Create a hash key for a k-point on a grid
 * Used for fast lookup when building the energy grid
 */
export function kPointToGridKey(
  kx: number,
  ky: number,
  kz: number,
  gridSize: number
): string {
  // Map from [-0.5, 0.5) to [0, gridSize)
  const ix = Math.round((kx + 0.5) * gridSize) % gridSize;
  const iy = Math.round((ky + 0.5) * gridSize) % gridSize;
  const iz = Math.round((kz + 0.5) * gridSize) % gridSize;

  return `${ix},${iy},${iz}`;
}

/**
 * Build a lookup map from grid indices to expanded k-points
 * Useful for quickly finding the nearest k-point for interpolation
 */
export function buildKPointLookupMap(
  expandedKPoints: ExpandedKPoint[],
  gridSize: number
): Map<string, ExpandedKPoint> {
  const map = new Map<string, ExpandedKPoint>();

  for (const kp of expandedKPoints) {
    const key = kPointToGridKey(kp.kx, kp.ky, kp.kz, gridSize);
    // If multiple k-points map to same grid cell, keep the first one
    if (!map.has(key)) {
      map.set(key, kp);
    }
  }

  return map;
}

/**
 * Find the nearest k-point to a given coordinate
 */
export function findNearestKPoint(
  kx: number,
  ky: number,
  kz: number,
  expandedKPoints: ExpandedKPoint[]
): ExpandedKPoint | null {
  if (expandedKPoints.length === 0) return null;

  let nearest = expandedKPoints[0];
  let minDist = Infinity;

  for (const kp of expandedKPoints) {
    // Consider periodicity
    let dx = Math.abs(kp.kx - kx);
    let dy = Math.abs(kp.ky - ky);
    let dz = Math.abs(kp.kz - kz);

    dx = Math.min(dx, 1.0 - dx);
    dy = Math.min(dy, 1.0 - dy);
    dz = Math.min(dz, 1.0 - dz);

    const dist = dx * dx + dy * dy + dz * dz;
    if (dist < minDist) {
      minDist = dist;
      nearest = kp;
    }
  }

  return nearest;
}

/**
 * Find the 8 nearest k-points for trilinear interpolation
 * Returns corners of the cube containing the point
 */
export function findInterpolationCube(
  kx: number,
  ky: number,
  kz: number,
  kpLookup: Map<string, ExpandedKPoint>,
  gridSize: number
): { corners: (ExpandedKPoint | null)[]; weights: number[] } {
  // Map to grid coordinates
  const gx = (kx + 0.5) * gridSize;
  const gy = (ky + 0.5) * gridSize;
  const gz = (kz + 0.5) * gridSize;

  // Get the lower corner indices
  const ix0 = Math.floor(gx);
  const iy0 = Math.floor(gy);
  const iz0 = Math.floor(gz);

  // Get fractional positions within the cell
  const fx = gx - ix0;
  const fy = gy - iy0;
  const fz = gz - iz0;

  // Get all 8 corners of the cube
  const corners: (ExpandedKPoint | null)[] = [];
  for (let dz = 0; dz <= 1; dz++) {
    for (let dy = 0; dy <= 1; dy++) {
      for (let dx = 0; dx <= 1; dx++) {
        const ix = (ix0 + dx) % gridSize;
        const iy = (iy0 + dy) % gridSize;
        const iz = (iz0 + dz) % gridSize;
        const key = `${ix},${iy},${iz}`;
        corners.push(kpLookup.get(key) || null);
      }
    }
  }

  // Trilinear interpolation weights
  const weights = [
    (1 - fx) * (1 - fy) * (1 - fz), // 000
    fx * (1 - fy) * (1 - fz),       // 100
    (1 - fx) * fy * (1 - fz),       // 010
    fx * fy * (1 - fz),             // 110
    (1 - fx) * (1 - fy) * fz,       // 001
    fx * (1 - fy) * fz,             // 101
    (1 - fx) * fy * fz,             // 011
    fx * fy * fz                    // 111
  ];

  return { corners, weights };
}
