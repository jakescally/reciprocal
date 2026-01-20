import { useState, useEffect, useRef, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Line, Html } from "@react-three/drei";
import * as THREE from "three";
import {
  Project,
  CrystalData,
  loadCrystalData,
} from "../lib/projects";
import {
  getBravaisLattice,
  getBravaisLatticeName,
  getHighSymmetryPoints,
} from "../lib/brillouinZone";
import {
  latticeParametersToVectors,
  calculateReciprocalLattice,
  getBrillouinZoneGeometry,
  transformBZToCartesian,
  getHighSymmetryPointsCartesian,
  getStandardKPath,
  ReciprocalLattice,
  BrillouinZoneGeometry,
  KPathSegment,
} from "../lib/brillouinZoneGeometry";

interface BrillouinZonePageProps {
  project: Project;
}

// Colors for the visualization
const COLORS = {
  bzEdge: "#3b82f6",       // Blue for BZ wireframe
  bzFace: "#3b82f6",       // Blue for BZ faces (transparent)
  kPath: "#ef4444",        // Red for k-path
  highSymmetry: "#f59e0b", // Amber for high-symmetry points
  reciprocalAxis: {
    b1: "#ef4444",         // Red
    b2: "#22c55e",         // Green
    b3: "#3b82f6",         // Blue
  },
};

// BZ Wireframe component
function BZWireframe({
  geometry,
  showFaces,
}: {
  geometry: BrillouinZoneGeometry;
  showFaces: boolean;
}) {
  // Create line segments for edges
  const lineSegments = useMemo(() => {
    const segments: [THREE.Vector3, THREE.Vector3][] = [];
    for (const [i, j] of geometry.edges) {
      segments.push([geometry.vertices[i], geometry.vertices[j]]);
    }
    return segments;
  }, [geometry]);

  return (
    <group>
      {/* Edges */}
      {lineSegments.map((segment, idx) => (
        <Line
          key={`edge-${idx}`}
          points={[segment[0], segment[1]]}
          color={COLORS.bzEdge}
          lineWidth={2}
        />
      ))}

      {/* Semi-transparent faces */}
      {showFaces && geometry.faces.map((face, faceIdx) => {
        if (face.length < 3) return null;

        // Create a shape from face vertices
        const faceVertices = face.map(i => geometry.vertices[i]);

        // Triangulate the face (simple fan triangulation)
        const triangles: THREE.Vector3[] = [];
        for (let i = 1; i < faceVertices.length - 1; i++) {
          triangles.push(faceVertices[0], faceVertices[i], faceVertices[i + 1]);
        }

        const positions = new Float32Array(triangles.length * 3);
        triangles.forEach((v, i) => {
          positions[i * 3] = v.x;
          positions[i * 3 + 1] = v.y;
          positions[i * 3 + 2] = v.z;
        });

        return (
          <mesh key={`face-${faceIdx}`}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[positions, 3]}
              />
            </bufferGeometry>
            <meshBasicMaterial
              color={COLORS.bzFace}
              transparent
              opacity={0.1}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// High-symmetry points component
function HighSymmetryPoints({
  points,
  showLabels,
}: {
  points: Array<{ label: string; position: THREE.Vector3 }>;
  showLabels: boolean;
}) {
  return (
    <group>
      {points.map((point, idx) => (
        <group key={`hs-${idx}`} position={point.position}>
          {/* Sphere for the point */}
          <mesh>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshStandardMaterial color={COLORS.highSymmetry} />
          </mesh>

          {/* Label */}
          {showLabels && (
            <Html
              position={[0.1, 0.1, 0]}
              style={{
                color: "#f59e0b",
                fontSize: "14px",
                fontWeight: "bold",
                textShadow: "0 0 3px rgba(0,0,0,0.5)",
                pointerEvents: "none",
                userSelect: "none",
              }}
            >
              {point.label}
            </Html>
          )}
        </group>
      ))}
    </group>
  );
}

// Arrow component for K-path direction
function KPathArrow({
  from,
  to,
  segmentNumber,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  segmentNumber: number;
}) {
  // Calculate midpoint and direction
  const midpoint = useMemo(() => {
    return new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  }, [from, to]);

  const direction = useMemo(() => {
    return new THREE.Vector3().subVectors(to, from).normalize();
  }, [from, to]);

  // Calculate rotation to point cone in direction of travel
  const rotation = useMemo(() => {
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    const euler = new THREE.Euler().setFromQuaternion(quaternion);
    return euler;
  }, [direction]);

  return (
    <group position={midpoint}>
      {/* Arrow cone */}
      <mesh rotation={rotation}>
        <coneGeometry args={[0.025, 0.07, 6]} />
        <meshStandardMaterial color={COLORS.kPath} />
      </mesh>
      {/* Segment number */}
      <Html
        position={[0.05, 0.05, 0]}
        style={{
          color: COLORS.kPath,
          fontSize: "9px",
          fontWeight: "bold",
          backgroundColor: "rgba(255, 255, 255, 0.85)",
          padding: "0px 3px",
          borderRadius: "2px",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {segmentNumber}
      </Html>
    </group>
  );
}

// K-path component
function KPath({
  segments,
  visible,
  showArrows,
}: {
  segments: KPathSegment[];
  visible: boolean;
  showArrows: boolean;
}) {
  if (!visible) return null;

  return (
    <group>
      {segments.map((segment, idx) => (
        <group key={`kpath-${idx}`}>
          <Line
            points={[segment.from.position, segment.to.position]}
            color={COLORS.kPath}
            lineWidth={3}
          />
          {showArrows && (
            <KPathArrow
              from={segment.from.position}
              to={segment.to.position}
              segmentNumber={idx + 1}
            />
          )}
        </group>
      ))}
    </group>
  );
}

// Reciprocal lattice vectors component
// Arrow head component for axis
function AxisArrowHead({
  position,
  direction,
  color,
}: {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  color: string;
}) {
  const rotation = useMemo(() => {
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    return new THREE.Euler().setFromQuaternion(quaternion);
  }, [direction]);

  return (
    <mesh position={position} rotation={rotation} renderOrder={1000}>
      <coneGeometry args={[0.03, 0.08, 8]} />
      <meshBasicMaterial color={color} depthTest={false} depthWrite={false} />
    </mesh>
  );
}

function ReciprocalAxes({
  reciprocal,
  visible,
}: {
  reciprocal: ReciprocalLattice;
  visible: boolean;
}) {
  if (!visible) return null;

  const origin = new THREE.Vector3(0, 0, 0);

  // Scale vectors for display
  const scale = 0.8;

  // Material props to render axes on top (no depth test)
  const axisMaterialProps = {
    depthTest: false,
    depthWrite: false,
    transparent: true,
  };

  // Calculate arrow positions and directions
  const b1End = reciprocal.b1.clone().multiplyScalar(scale);
  const b2End = reciprocal.b2.clone().multiplyScalar(scale);
  const b3End = reciprocal.b3.clone().multiplyScalar(scale);

  return (
    <group renderOrder={999}>
      {/* b1 axis */}
      <Line
        points={[origin, b1End]}
        color={COLORS.reciprocalAxis.b1}
        lineWidth={2}
        {...axisMaterialProps}
      />
      <AxisArrowHead
        position={b1End}
        direction={reciprocal.b1}
        color={COLORS.reciprocalAxis.b1}
      />
      <Html position={reciprocal.b1.clone().multiplyScalar(scale * 1.15)}>
        <span style={{ color: COLORS.reciprocalAxis.b1, fontWeight: "bold", fontSize: "12px" }}>
          b₁
        </span>
      </Html>

      {/* b2 axis */}
      <Line
        points={[origin, b2End]}
        color={COLORS.reciprocalAxis.b2}
        lineWidth={2}
        {...axisMaterialProps}
      />
      <AxisArrowHead
        position={b2End}
        direction={reciprocal.b2}
        color={COLORS.reciprocalAxis.b2}
      />
      <Html position={reciprocal.b2.clone().multiplyScalar(scale * 1.15)}>
        <span style={{ color: COLORS.reciprocalAxis.b2, fontWeight: "bold", fontSize: "12px" }}>
          b₂
        </span>
      </Html>

      {/* b3 axis */}
      <Line
        points={[origin, b3End]}
        color={COLORS.reciprocalAxis.b3}
        lineWidth={2}
        {...axisMaterialProps}
      />
      <AxisArrowHead
        position={b3End}
        direction={reciprocal.b3}
        color={COLORS.reciprocalAxis.b3}
      />
      <Html position={reciprocal.b3.clone().multiplyScalar(scale * 1.15)}>
        <span style={{ color: COLORS.reciprocalAxis.b3, fontWeight: "bold", fontSize: "12px" }}>
          b₃
        </span>
      </Html>
    </group>
  );
}

// Gamma point indicator (origin)
function GammaPoint() {
  return (
    <mesh position={[0, 0, 0]}>
      <sphereGeometry args={[0.06, 16, 16]} />
      <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
    </mesh>
  );
}

// Main 3D scene
function Scene({
  bzGeometry,
  reciprocal,
  highSymmetryPoints,
  kPath,
  showFaces,
  showLabels,
  showKPath,
  showKPathArrows,
  showAxes,
}: {
  bzGeometry: BrillouinZoneGeometry;
  reciprocal: ReciprocalLattice;
  highSymmetryPoints: Array<{ label: string; position: THREE.Vector3 }>;
  kPath: KPathSegment[];
  showFaces: boolean;
  showLabels: boolean;
  showKPath: boolean;
  showKPathArrows: boolean;
  showAxes: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-5, -5, -5]} intensity={0.3} />

      <group ref={groupRef}>
        <BZWireframe geometry={bzGeometry} showFaces={showFaces} />
        <HighSymmetryPoints points={highSymmetryPoints} showLabels={showLabels} />
        <KPath segments={kPath} visible={showKPath} showArrows={showKPathArrows} />
        <ReciprocalAxes reciprocal={reciprocal} visible={showAxes} />
        <GammaPoint />
      </group>

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={1}
        maxDistance={20}
      />
    </>
  );
}

export function BrillouinZonePage({ project }: BrillouinZonePageProps) {
  const [crystalData, setCrystalData] = useState<CrystalData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Visualization options
  const [showFaces, setShowFaces] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showKPath, setShowKPath] = useState(true);
  const [showKPathArrows, setShowKPathArrows] = useState(true);
  const [showAxes, setShowAxes] = useState(true);

  // Load crystal data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      if (!project.has_cif) {
        setError("No CIF file imported for this project");
        setIsLoading(false);
        return;
      }

      try {
        const data = await loadCrystalData(project.id);
        if (data) {
          setCrystalData(data);
        } else {
          setError("Failed to load crystal data");
        }
      } catch (err) {
        console.error("Failed to load crystal data:", err);
        setError(String(err));
      }
      setIsLoading(false);
    };

    loadData();
  }, [project.id, project.has_cif]);

  // Calculate all geometry
  const {
    bravaisLattice,
    reciprocal,
    bzGeometry,
    highSymmetryPoints,
    kPath,
  } = useMemo(() => {
    if (!crystalData || !crystalData.space_group_IT_number) {
      return {
        bravaisLattice: null,
        reciprocal: null,
        bzGeometry: null,
        highSymmetryPoints: [],
        kPath: [],
      };
    }

    // Get Bravais lattice
    const lattice = getBravaisLattice(
      crystalData.space_group_IT_number,
      crystalData.space_group_HM
    );

    // Calculate lattice vectors
    const latticeVectors = latticeParametersToVectors(
      crystalData.cell_length_a.value,
      crystalData.cell_length_b.value,
      crystalData.cell_length_c.value,
      crystalData.cell_angle_alpha.value,
      crystalData.cell_angle_beta.value,
      crystalData.cell_angle_gamma.value
    );

    // Calculate reciprocal lattice
    const reciprocalLattice = calculateReciprocalLattice(latticeVectors);

    // Get BZ geometry in fractional coords
    const bzGeomFractional = getBrillouinZoneGeometry(lattice);

    // Transform to Cartesian
    const bzGeomCartesian = transformBZToCartesian(bzGeomFractional, reciprocalLattice);

    // Get high-symmetry points
    const hsPoints = getHighSymmetryPointsCartesian(lattice, reciprocalLattice);

    // Get k-path
    const path = getStandardKPath(lattice, reciprocalLattice);

    return {
      bravaisLattice: lattice,
      reciprocal: reciprocalLattice,
      bzGeometry: bzGeomCartesian,
      highSymmetryPoints: hsPoints,
      kPath: path,
    };
  }, [crystalData]);

  // Calculate camera distance based on BZ size
  const cameraDistance = useMemo(() => {
    if (!bzGeometry) return 5;
    let maxDist = 0;
    for (const v of bzGeometry.vertices) {
      const dist = v.length();
      if (dist > maxDist) maxDist = dist;
    }
    return Math.max(3, maxDist * 3);
  }, [bzGeometry]);

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="glass rounded-3xl p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading crystal data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !crystalData || !bzGeometry || !reciprocal) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="glass rounded-3xl p-8 text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {error || "Unable to display Brillouin zone"}
          </h2>
          <p className="text-gray-600">
            Please ensure a CIF file with valid space group information has been imported.
          </p>
        </div>
      </div>
    );
  }

  const hsPointsList = getHighSymmetryPoints(bravaisLattice!);

  return (
    <div className="h-screen w-full overflow-hidden">
      {/* Full-screen 3D canvas */}
      <div className="absolute inset-0">
        <Canvas
          camera={{
            position: [cameraDistance * 0.7, cameraDistance * 0.5, cameraDistance * 0.7],
            fov: 45,
            near: 0.1,
            far: 100,
          }}
          style={{ background: "#ffffff" }}
        >
          <Scene
            bzGeometry={bzGeometry}
            reciprocal={reciprocal}
            highSymmetryPoints={highSymmetryPoints}
            kPath={kPath}
            showFaces={showFaces}
            showLabels={showLabels}
            showKPath={showKPath}
            showKPathArrows={showKPathArrows}
            showAxes={showAxes}
          />
        </Canvas>
      </div>

      {/* Floating info card - top left */}
      <div className="absolute top-28 left-8 z-10">
        <div className="glass rounded-2xl p-5 min-w-[280px]">
          <h3 className="font-semibold text-gray-800 mb-3">Brillouin Zone</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-500">Bravais Lattice:</span>{" "}
              <span className="text-gray-800 font-medium">
                {getBravaisLatticeName(bravaisLattice!)}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Space Group:</span>{" "}
              <span className="text-gray-800 font-medium">
                {crystalData.space_group_HM} ({crystalData.space_group_IT_number})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating controls card - top right */}
      <div className="absolute top-28 right-8 z-10">
        <div className="glass rounded-2xl p-5 min-w-[200px]">
          <h3 className="font-semibold text-gray-800 mb-3">Display Options</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showFaces}
                onChange={(e) => setShowFaces(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-gray-700">Show Faces</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-gray-700">Show Labels</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showKPath}
                onChange={(e) => setShowKPath(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-gray-700">Show K-Path</span>
            </label>
            {showKPath && (
              <label className="flex items-center gap-2 cursor-pointer ml-6">
                <input
                  type="checkbox"
                  checked={showKPathArrows}
                  onChange={(e) => setShowKPathArrows(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-gray-600">Show Arrows</span>
              </label>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showAxes}
                onChange={(e) => setShowAxes(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-gray-700">Show Reciprocal Axes</span>
            </label>
          </div>
        </div>
      </div>

      {/* Floating high-symmetry points card - bottom left */}
      <div className="absolute bottom-8 left-8 z-10">
        <div className="glass rounded-2xl p-5 max-w-[320px] max-h-[300px] overflow-y-auto">
          <h3 className="font-semibold text-gray-800 mb-3">High-Symmetry Points</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {hsPointsList.map((point, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="font-bold text-amber-500 w-6">{point.label}</span>
                <span className="text-gray-600 font-mono text-xs">
                  ({point.coordinates.map(c => c.toFixed(2)).join(", ")})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* K-path card - bottom right */}
      <div className="absolute bottom-8 right-8 z-10">
        <div className="glass rounded-2xl p-5 max-w-[280px]">
          <h3 className="font-semibold text-gray-800 mb-3">K-Path</h3>
          <div className="flex flex-wrap gap-1 items-center text-sm">
            {kPath.map((segment, idx) => (
              <span key={idx} className="flex items-center">
                {idx === 0 && (
                  <span className="font-bold text-red-500">{segment.from.label}</span>
                )}
                <span className="text-gray-400 mx-1">→</span>
                <span className="font-bold text-red-500">{segment.to.label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Legend - bottom center */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
        <div className="glass rounded-2xl px-6 py-3 flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-blue-500" />
            <span className="text-gray-600">BZ Edges</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-gray-600">High-Symmetry Points</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-red-500" />
            <span className="text-gray-600">K-Path</span>
          </div>
        </div>
      </div>
    </div>
  );
}
