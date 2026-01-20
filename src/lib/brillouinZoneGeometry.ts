/**
 * Brillouin Zone Geometry Calculations
 *
 * Provides functions to calculate:
 * - Reciprocal lattice vectors from real-space lattice parameters
 * - First Brillouin zone vertices and edges for each Bravais lattice
 * - Standard k-paths through high-symmetry points
 */

import * as THREE from "three";
import { BravaisLattice, getHighSymmetryPoints } from "./brillouinZone";

export interface LatticeVectors {
  a1: THREE.Vector3;
  a2: THREE.Vector3;
  a3: THREE.Vector3;
}

export interface ReciprocalLattice {
  b1: THREE.Vector3;
  b2: THREE.Vector3;
  b3: THREE.Vector3;
  volume: number; // reciprocal space volume
}

export interface BrillouinZoneGeometry {
  vertices: THREE.Vector3[];
  edges: [number, number][]; // pairs of vertex indices
  faces: number[][]; // arrays of vertex indices forming each face
}

export interface KPathSegment {
  from: { label: string; position: THREE.Vector3 };
  to: { label: string; position: THREE.Vector3 };
}

/**
 * Convert lattice parameters (a, b, c, alpha, beta, gamma) to Cartesian basis vectors
 * Convention: a along X, b in XY plane, c general
 */
export function latticeParametersToVectors(
  a: number,
  b: number,
  c: number,
  alpha: number, // angle between b and c (degrees)
  beta: number,  // angle between a and c (degrees)
  gamma: number  // angle between a and b (degrees)
): LatticeVectors {
  // Convert angles to radians
  const alphaRad = (alpha * Math.PI) / 180;
  const betaRad = (beta * Math.PI) / 180;
  const gammaRad = (gamma * Math.PI) / 180;

  // a vector along x-axis
  const a1 = new THREE.Vector3(a, 0, 0);

  // b vector in xy plane
  const a2 = new THREE.Vector3(
    b * Math.cos(gammaRad),
    b * Math.sin(gammaRad),
    0
  );

  // c vector - general case
  const cx = c * Math.cos(betaRad);
  const cy = (c * (Math.cos(alphaRad) - Math.cos(betaRad) * Math.cos(gammaRad))) / Math.sin(gammaRad);
  const cz = Math.sqrt(Math.max(0, c * c - cx * cx - cy * cy));
  const a3 = new THREE.Vector3(cx, cy, cz);

  return { a1, a2, a3 };
}

/**
 * Calculate reciprocal lattice vectors from direct lattice vectors
 * b_i = 2π (a_j × a_k) / V where V = a1 · (a2 × a3)
 */
export function calculateReciprocalLattice(lattice: LatticeVectors): ReciprocalLattice {
  const { a1, a2, a3 } = lattice;

  // Calculate cell volume
  const volume = a1.dot(new THREE.Vector3().crossVectors(a2, a3));

  // Calculate reciprocal vectors (factor of 2π included)
  const factor = (2 * Math.PI) / volume;

  const b1 = new THREE.Vector3().crossVectors(a2, a3).multiplyScalar(factor);
  const b2 = new THREE.Vector3().crossVectors(a3, a1).multiplyScalar(factor);
  const b3 = new THREE.Vector3().crossVectors(a1, a2).multiplyScalar(factor);

  // Reciprocal space volume
  const reciprocalVolume = b1.dot(new THREE.Vector3().crossVectors(b2, b3));

  return { b1, b2, b3, volume: reciprocalVolume };
}

/**
 * Convert fractional reciprocal coordinates to Cartesian
 */
export function fractionalToCartesian(
  kx: number,
  ky: number,
  kz: number,
  reciprocal: ReciprocalLattice
): THREE.Vector3 {
  return new THREE.Vector3()
    .addScaledVector(reciprocal.b1, kx)
    .addScaledVector(reciprocal.b2, ky)
    .addScaledVector(reciprocal.b3, kz);
}

/**
 * Get Brillouin zone geometry for a given Bravais lattice
 * Returns vertices and edges in fractional reciprocal coordinates
 */
export function getBrillouinZoneGeometry(bravaisLattice: BravaisLattice): BrillouinZoneGeometry {
  // BZ shapes defined in fractional reciprocal lattice coordinates
  // These are the standard first Brillouin zones (Wigner-Seitz cells)

  switch (bravaisLattice) {
    case "cP": // Simple cubic - cube
      return {
        vertices: [
          new THREE.Vector3(-0.5, -0.5, -0.5),
          new THREE.Vector3(0.5, -0.5, -0.5),
          new THREE.Vector3(0.5, 0.5, -0.5),
          new THREE.Vector3(-0.5, 0.5, -0.5),
          new THREE.Vector3(-0.5, -0.5, 0.5),
          new THREE.Vector3(0.5, -0.5, 0.5),
          new THREE.Vector3(0.5, 0.5, 0.5),
          new THREE.Vector3(-0.5, 0.5, 0.5),
        ],
        edges: [
          [0, 1], [1, 2], [2, 3], [3, 0], // bottom
          [4, 5], [5, 6], [6, 7], [7, 4], // top
          [0, 4], [1, 5], [2, 6], [3, 7], // sides
        ],
        faces: [
          [0, 1, 2, 3], // bottom
          [4, 5, 6, 7], // top
          [0, 1, 5, 4], // front
          [2, 3, 7, 6], // back
          [0, 3, 7, 4], // left
          [1, 2, 6, 5], // right
        ],
      };

    case "cI": // BCC - truncated octahedron (rhombic dodecahedron)
      return {
        vertices: [
          // Vertices of the truncated octahedron for BCC
          new THREE.Vector3(0, 0.5, -0.5),
          new THREE.Vector3(0.5, 0, -0.5),
          new THREE.Vector3(0, -0.5, -0.5),
          new THREE.Vector3(-0.5, 0, -0.5),
          new THREE.Vector3(0.5, 0.5, 0),
          new THREE.Vector3(0.5, -0.5, 0),
          new THREE.Vector3(-0.5, -0.5, 0),
          new THREE.Vector3(-0.5, 0.5, 0),
          new THREE.Vector3(0, 0.5, 0.5),
          new THREE.Vector3(0.5, 0, 0.5),
          new THREE.Vector3(0, -0.5, 0.5),
          new THREE.Vector3(-0.5, 0, 0.5),
        ],
        edges: [
          [0, 1], [1, 2], [2, 3], [3, 0],
          [0, 4], [1, 4], [1, 5], [2, 5],
          [2, 6], [3, 6], [3, 7], [0, 7],
          [4, 8], [4, 9], [5, 9], [5, 10],
          [6, 10], [6, 11], [7, 11], [7, 8],
          [8, 9], [9, 10], [10, 11], [11, 8],
        ],
        faces: [
          [0, 1, 2, 3],
          [8, 9, 10, 11],
          [0, 4, 8, 7], [0, 1, 4],
          [1, 5, 9, 4], [1, 2, 5],
          [2, 6, 10, 5], [2, 3, 6],
          [3, 7, 11, 6], [3, 0, 7],
          [4, 9, 8], [5, 10, 9],
          [6, 11, 10], [7, 8, 11],
        ],
      };

    case "cF": // FCC - truncated octahedron
      return {
        vertices: [
          // FCC BZ vertices (truncated octahedron)
          new THREE.Vector3(0.5, 0.25, 0.75),
          new THREE.Vector3(0.75, 0.5, 0.25),
          new THREE.Vector3(0.25, 0.75, 0.5),
          new THREE.Vector3(0.5, 0.75, 0.25),
          new THREE.Vector3(0.75, 0.25, 0.5),
          new THREE.Vector3(0.25, 0.5, 0.75),
          new THREE.Vector3(-0.5, -0.25, -0.75),
          new THREE.Vector3(-0.75, -0.5, -0.25),
          new THREE.Vector3(-0.25, -0.75, -0.5),
          new THREE.Vector3(-0.5, -0.75, -0.25),
          new THREE.Vector3(-0.75, -0.25, -0.5),
          new THREE.Vector3(-0.25, -0.5, -0.75),
          new THREE.Vector3(0.5, -0.25, 0.75),
          new THREE.Vector3(0.75, -0.5, 0.25),
          new THREE.Vector3(0.25, -0.75, 0.5),
        ],
        edges: [
          [0, 4], [4, 1], [1, 3], [3, 2], [2, 5], [5, 0],
          [6, 10], [10, 7], [7, 9], [9, 8], [8, 11], [11, 6],
        ],
        faces: [],
      };

    case "hP": // Hexagonal - hexagonal prism
      {
        const h = 0.5; // half height
        const r = 1 / Math.sqrt(3); // radius to vertex
        const vertices: THREE.Vector3[] = [];

        // Bottom hexagon
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          vertices.push(new THREE.Vector3(
            r * Math.cos(angle),
            r * Math.sin(angle),
            -h
          ));
        }
        // Top hexagon
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          vertices.push(new THREE.Vector3(
            r * Math.cos(angle),
            r * Math.sin(angle),
            h
          ));
        }

        return {
          vertices,
          edges: [
            // Bottom hexagon
            [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0],
            // Top hexagon
            [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 6],
            // Vertical edges
            [0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11],
          ],
          faces: [
            [0, 1, 2, 3, 4, 5], // bottom
            [6, 7, 8, 9, 10, 11], // top
            [0, 1, 7, 6], [1, 2, 8, 7], [2, 3, 9, 8],
            [3, 4, 10, 9], [4, 5, 11, 10], [5, 0, 6, 11],
          ],
        };
      }

    case "tP": // Tetragonal primitive - rectangular prism
      return {
        vertices: [
          new THREE.Vector3(-0.5, -0.5, -0.5),
          new THREE.Vector3(0.5, -0.5, -0.5),
          new THREE.Vector3(0.5, 0.5, -0.5),
          new THREE.Vector3(-0.5, 0.5, -0.5),
          new THREE.Vector3(-0.5, -0.5, 0.5),
          new THREE.Vector3(0.5, -0.5, 0.5),
          new THREE.Vector3(0.5, 0.5, 0.5),
          new THREE.Vector3(-0.5, 0.5, 0.5),
        ],
        edges: [
          [0, 1], [1, 2], [2, 3], [3, 0],
          [4, 5], [5, 6], [6, 7], [7, 4],
          [0, 4], [1, 5], [2, 6], [3, 7],
        ],
        faces: [
          [0, 1, 2, 3],
          [4, 5, 6, 7],
          [0, 1, 5, 4],
          [2, 3, 7, 6],
          [0, 3, 7, 4],
          [1, 2, 6, 5],
        ],
      };

    case "tI": // Tetragonal body-centered
      return {
        vertices: [
          new THREE.Vector3(0, 0, -0.5),
          new THREE.Vector3(0.5, -0.5, 0),
          new THREE.Vector3(0.5, 0.5, 0),
          new THREE.Vector3(-0.5, 0.5, 0),
          new THREE.Vector3(-0.5, -0.5, 0),
          new THREE.Vector3(0, 0, 0.5),
        ],
        edges: [
          [0, 1], [0, 2], [0, 3], [0, 4],
          [5, 1], [5, 2], [5, 3], [5, 4],
          [1, 2], [2, 3], [3, 4], [4, 1],
        ],
        faces: [
          [0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 1],
          [5, 1, 2], [5, 2, 3], [5, 3, 4], [5, 4, 1],
        ],
      };

    case "oP": // Orthorhombic primitive - rectangular prism (cuboid)
      return {
        vertices: [
          new THREE.Vector3(-0.5, -0.5, -0.5),
          new THREE.Vector3(0.5, -0.5, -0.5),
          new THREE.Vector3(0.5, 0.5, -0.5),
          new THREE.Vector3(-0.5, 0.5, -0.5),
          new THREE.Vector3(-0.5, -0.5, 0.5),
          new THREE.Vector3(0.5, -0.5, 0.5),
          new THREE.Vector3(0.5, 0.5, 0.5),
          new THREE.Vector3(-0.5, 0.5, 0.5),
        ],
        edges: [
          [0, 1], [1, 2], [2, 3], [3, 0],
          [4, 5], [5, 6], [6, 7], [7, 4],
          [0, 4], [1, 5], [2, 6], [3, 7],
        ],
        faces: [
          [0, 1, 2, 3],
          [4, 5, 6, 7],
          [0, 1, 5, 4],
          [2, 3, 7, 6],
          [0, 3, 7, 4],
          [1, 2, 6, 5],
        ],
      };

    case "hR": // Rhombohedral - rhombohedron
      {
        const a = 0.5;
        return {
          vertices: [
            new THREE.Vector3(a, 0, 0),
            new THREE.Vector3(0, a, 0),
            new THREE.Vector3(0, 0, a),
            new THREE.Vector3(-a, 0, 0),
            new THREE.Vector3(0, -a, 0),
            new THREE.Vector3(0, 0, -a),
          ],
          edges: [
            [0, 1], [1, 2], [2, 0],
            [3, 4], [4, 5], [5, 3],
            [0, 5], [1, 5], [2, 3], [2, 4], [0, 4], [1, 3],
          ],
          faces: [
            [0, 1, 2],
            [3, 4, 5],
            [0, 1, 5], [1, 2, 3], [2, 0, 4], [0, 4, 5], [1, 3, 5], [2, 3, 4],
          ],
        };
      }

    // For other lattice types, use a generic approach
    default:
      // Default to a simple parallelepiped based on reciprocal vectors
      return {
        vertices: [
          new THREE.Vector3(-0.5, -0.5, -0.5),
          new THREE.Vector3(0.5, -0.5, -0.5),
          new THREE.Vector3(0.5, 0.5, -0.5),
          new THREE.Vector3(-0.5, 0.5, -0.5),
          new THREE.Vector3(-0.5, -0.5, 0.5),
          new THREE.Vector3(0.5, -0.5, 0.5),
          new THREE.Vector3(0.5, 0.5, 0.5),
          new THREE.Vector3(-0.5, 0.5, 0.5),
        ],
        edges: [
          [0, 1], [1, 2], [2, 3], [3, 0],
          [4, 5], [5, 6], [6, 7], [7, 4],
          [0, 4], [1, 5], [2, 6], [3, 7],
        ],
        faces: [
          [0, 1, 2, 3],
          [4, 5, 6, 7],
          [0, 1, 5, 4],
          [2, 3, 7, 6],
          [0, 3, 7, 4],
          [1, 2, 6, 5],
        ],
      };
  }
}

/**
 * Transform BZ geometry vertices from fractional to Cartesian coordinates
 */
export function transformBZToCartesian(
  geometry: BrillouinZoneGeometry,
  reciprocal: ReciprocalLattice
): BrillouinZoneGeometry {
  const transformedVertices = geometry.vertices.map(v =>
    fractionalToCartesian(v.x, v.y, v.z, reciprocal)
  );

  return {
    vertices: transformedVertices,
    edges: geometry.edges,
    faces: geometry.faces,
  };
}

/**
 * Get high-symmetry points in Cartesian coordinates
 */
export function getHighSymmetryPointsCartesian(
  bravaisLattice: BravaisLattice,
  reciprocal: ReciprocalLattice
): Array<{ label: string; position: THREE.Vector3 }> {
  const points = getHighSymmetryPoints(bravaisLattice);

  return points.map(p => ({
    label: p.label,
    position: fractionalToCartesian(
      p.coordinates[0],
      p.coordinates[1],
      p.coordinates[2],
      reciprocal
    ),
  }));
}

/**
 * Generate a standard k-path through high-symmetry points
 */
export function getStandardKPath(
  bravaisLattice: BravaisLattice,
  reciprocal: ReciprocalLattice
): KPathSegment[] {
  const points = getHighSymmetryPointsCartesian(bravaisLattice, reciprocal);
  const segments: KPathSegment[] = [];

  // Standard paths for common lattices
  const pathOrders: Record<BravaisLattice, string[]> = {
    cP: ["Γ", "X", "M", "Γ", "R", "X"],
    cI: ["Γ", "H", "N", "Γ", "P", "H"],
    cF: ["Γ", "X", "W", "K", "Γ", "L", "U", "W"],
    hP: ["Γ", "M", "K", "Γ", "A", "L", "H", "A"],
    hR: ["Γ", "T", "L", "Γ", "F"],
    tP: ["Γ", "X", "M", "Γ", "Z", "R", "A", "Z"],
    tI: ["Γ", "X", "M", "Γ", "N", "P"],
    oP: ["Γ", "X", "S", "Y", "Γ", "Z", "U", "R", "T", "Z"],
    oS: ["Γ", "X", "S", "Y", "Γ", "Z"],
    oI: ["Γ", "X", "L", "T", "Γ"],
    oF: ["Γ", "X", "Y", "Γ", "Z", "L"],
    mP: ["Γ", "Z", "D", "B", "Γ", "A", "E", "Z"],
    mS: ["Γ", "Y", "A", "M", "Γ"],
    aP: ["Γ", "X", "Y", "Γ", "Z", "R"],
  };

  const order = pathOrders[bravaisLattice] || ["Γ"];

  for (let i = 0; i < order.length - 1; i++) {
    const fromPoint = points.find(p => p.label === order[i]);
    const toPoint = points.find(p => p.label === order[i + 1]);

    if (fromPoint && toPoint) {
      segments.push({
        from: fromPoint,
        to: toPoint,
      });
    }
  }

  return segments;
}

/**
 * Calculate the optimal camera distance to view the BZ
 */
export function calculateOptimalCameraDistance(
  geometry: BrillouinZoneGeometry
): number {
  let maxDist = 0;
  for (const v of geometry.vertices) {
    const dist = v.length();
    if (dist > maxDist) maxDist = dist;
  }
  return maxDist * 3;
}
