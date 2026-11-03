/**
 * Bottle 3D Component
 * Renders a 3D bottle mesh based on bottle parameters
 */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Bottle, ClosureDrawing, CollarDrawing, DrawingProfile } from '@/types';
import { useStore } from '@/store';
import { ovalShoulderEdges, profileTop, sectionPoint } from '@/services/drawingProfile';
import {
  createClosureGeometries,
  createCollarGeometries,
  createClosureTopTexture,
  createFlipTopGeometries,
  createProfileBodyGeometry,
  createThreadGeometry,
} from './drawingGeometry';

interface Bottle3DProps {
  bottle: Bottle;
  position: [number, number, number];
  isSelected?: boolean;
  showMeasurements?: boolean;
  /** Render as a faded ghost behind a hero bottle. */
  dimmed?: boolean;
  /** Replaces the default click behaviour (making the bottle the active library bottle). */
  onSelect?: () => void;
}

const DIMMED_OPACITY = 0.12;

export default function Bottle3D({ 
  bottle, 
  position, 
  isSelected = false,
  showMeasurements = false,
  dimmed = false,
  onSelect,
}: Bottle3DProps) {
  const meshRef = useRef<THREE.Group>(null);
  const { setActiveBottle } = useStore();
  
  // Generate bottle geometry based on shape
  // Use JSON-serialized dimensions as dependency to ensure proper change detection
  const dimensionsKey = JSON.stringify(bottle.dimensions);
  const { bodyGeometry, neckGeometry, capGeometry } = useMemo(() => {
    return generateBottleGeometry(bottle);
  }, [bottle.shape, dimensionsKey, bottle.capStyle]);
  
  const opacity = dimmed ? DIMMED_OPACITY : bottle.opacity;

  // Materials
  const bodyMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: bottle.bodyColor,
      transparent: opacity < 1,
      opacity,
      depthWrite: !dimmed,
      roughness: 0.2,
      metalness: 0,
      clearcoat: 0.3,
      clearcoatRoughness: 0.2,
    });
  }, [bottle.bodyColor, opacity, dimmed]);
  
  const capMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: bottle.capColor,
      transparent: dimmed,
      opacity: dimmed ? DIMMED_OPACITY : 1,
      depthWrite: !dimmed,
      roughness: 0.5,
      metalness: 0.1,
    });
  }, [bottle.capColor, dimmed]);
  
  // Selection highlight animation
  useFrame((state) => {
    if (meshRef.current && isSelected) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }
  });
  
  const handleClick = (e: any) => {
    e.stopPropagation?.();
    if (onSelect) {
      onSelect();
    } else {
      setActiveBottle(bottle.id);
    }
  };
  
  const dims = bottle.dimensions;

  if (bottle.profile) {
    return (
      <group ref={meshRef} position={position} onClick={handleClick}>
        <DrawingBottle
          profile={bottle.profile}
          closure={bottle.closure}
          collar={bottle.collar}
          bodyColor={bottle.bodyColor}
          capColor={bottle.capColor}
          opacity={opacity}
          dimmed={dimmed}
        />
        {isSelected && (
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[dims.diameter / 2 + 5, dims.diameter / 2 + 8, 32]} />
            <meshBasicMaterial color="#3b82f6" transparent opacity={0.5} />
          </mesh>
        )}
        {showMeasurements && (
          <Html
            center
            position={[
              0,
              profileTop(bottle.profile) +
                (bottle.closure ? bottle.closure.height - bottle.closure.skirtDepth : 0) +
                20,
              0,
            ]}
          >
            <div className="bg-white/90 px-2 py-1 rounded shadow text-xs font-medium whitespace-nowrap">
              {bottle.name}
            </div>
          </Html>
        )}
      </group>
    );
  }
  
  // Calculate body height used in geometry (body minus neck for shapes that include shoulder)
  const bodyOnlyHeight = dims.bodyHeight - dims.neckHeight;
  
  // Cap dimensions for positioning
  const capHeight = dims.neckDiameter * 0.5;
  // Adjust cap height based on style
  let effectiveCapHeight = capHeight;
  switch (bottle.capStyle) {
    case 'child-resistant': effectiveCapHeight = capHeight * 1.2; break;
    case 'flip-top': effectiveCapHeight = capHeight * 0.8; break;
    case 'dropper': effectiveCapHeight = capHeight * 2.5; break;
    case 'pump': effectiveCapHeight = capHeight * 2; break;
    case 'spray': effectiveCapHeight = capHeight * 1.8; break;
    default: effectiveCapHeight = capHeight; break;
  }
  
  return (
    <group
      ref={meshRef}
      position={position}
      onClick={handleClick}
    >
      {/* Body - positioned so bottom sits at y=0 */}
      <mesh
        geometry={bodyGeometry}
        material={bodyMaterial}
        castShadow={!dimmed}
        receiveShadow
        position={[0, 0, 0]}
      />
      
      {/* Neck - sits on top of body */}
      <mesh
        geometry={neckGeometry}
        material={bodyMaterial}
        castShadow={!dimmed}
        position={[0, bodyOnlyHeight, 0]}
      />
      
      {/* Cap - sits on top of neck */}
      <mesh
        geometry={capGeometry}
        material={capMaterial}
        castShadow={!dimmed}
        position={[0, bodyOnlyHeight + dims.neckHeight + effectiveCapHeight / 2, 0]}
      />
      
      {/* Selection ring */}
      {isSelected && (
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[dims.diameter / 2 + 5, dims.diameter / 2 + 8, 32]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.5} />
        </mesh>
      )}
      
      {/* Label zones */}
      {!dimmed && bottle.labelZones.map((zone) => (
        <mesh
          key={zone.id}
          position={[0, bodyOnlyHeight - zone.topOffset - zone.height / 2, 0]}
        >
          <cylinderGeometry
            args={[
              dims.diameter / 2 + 0.5,
              dims.diameter / 2 + 0.5,
              zone.height,
              32,
              1,
              true,
              0,
              (zone.wrapAngle / 360) * Math.PI * 2
            ]}
          />
          <meshBasicMaterial
            color={zone.color || '#e5e7eb'}
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      
      {/* Measurements overlay */}
      {showMeasurements && (
        <Html
          center
          position={[0, bodyOnlyHeight + dims.neckHeight + effectiveCapHeight + 20, 0]}
        >
          <div className="bg-white/90 px-2 py-1 rounded shadow text-xs font-medium whitespace-nowrap">
            {bottle.name}
          </div>
        </Html>
      )}
    </group>
  );
}

/**
 * Bottle traced from a drawing: revolved shell, helical thread, label panel
 * edges, and the drawn closure seated on the finish.
 */
function DrawingBottle({
  profile,
  closure,
  collar,
  bodyColor,
  capColor,
  opacity,
  dimmed,
}: {
  profile: DrawingProfile;
  closure?: ClosureDrawing;
  collar?: CollarDrawing;
  bodyColor: string;
  capColor: string;
  opacity: number;
  dimmed: boolean;
}) {
  const body = useMemo(() => createProfileBodyGeometry(profile), [profile]);
  const thread = useMemo(() => createThreadGeometry(profile), [profile]);

  // Satin blow-moulded HDPE rather than glossy plastic
  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: bodyColor,
        roughness: 0.55,
        metalness: 0,
        clearcoat: 0.05,
        sheen: 0.3,
        sheenRoughness: 0.8,
        transparent: opacity < 1,
        opacity,
        depthWrite: !dimmed,
        side: THREE.DoubleSide,
      }),
    [bodyColor, opacity, dimmed]
  );

  const labelEdges = useMemo(() => {
    if (!profile.labelPanel) return [];
    const r = profile.outer.reduce((m, [pr]) => Math.max(m, pr), 0) + 0.15;
    const { bottomY, height } = profile.labelPanel;
    return [bottomY, bottomY + height].map((y) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i < 96; i++) {
        const [x, z] = sectionPoint(profile.oval, r, y, (i / 96) * Math.PI * 2);
        pts.push(new THREE.Vector3(x, y, z));
      }
      return new THREE.BufferGeometry().setFromPoints(pts);
    });
  }, [profile]);

  const shoulderEdges = useMemo(() => {
    const lineMaterial = new THREE.LineBasicMaterial({ color: '#64748b', transparent: true, opacity: 0.8 });
    return ovalShoulderEdges(profile).map((pts) => {
      const geo = new THREE.BufferGeometry().setFromPoints(
        pts.map(([x, y, z]) => new THREE.Vector3(x * 1.004, y, z * 1.004))
      );
      return new THREE.Line(geo, lineMaterial);
    });
  }, [profile]);

  return (
    <group>
      <mesh geometry={body} material={material} castShadow={!dimmed} receiveShadow />
      {thread && <mesh geometry={thread} material={material} castShadow={!dimmed} />}
      {!dimmed && labelEdges.map((geo, i) => (
        <lineLoop key={i} geometry={geo}>
          <lineBasicMaterial color="#94a3b8" transparent opacity={0.55} />
        </lineLoop>
      ))}
      {!dimmed && shoulderEdges.map((line, i) => <primitive key={`s${i}`} object={line} />)}
      {collar && (
        <group position={[0, collar.seatY, 0]}>
          <CollarModel collar={collar} color={capColor} opacity={dimmed ? opacity : 1} />
        </group>
      )}
      {closure && (
        <group position={[0, profileTop(profile) - closure.skirtDepth, 0]}>
          <ClosureModel closure={closure} color={capColor} opacity={dimmed ? opacity : 1} />
        </group>
      )}
    </group>
  );
}

/** Collar from a drawing, with y = 0 at its base. */
function CollarModel({ collar, color, opacity }: { collar: CollarDrawing; color: string; opacity: number }) {
  const parts = useMemo(() => createCollarGeometries(collar), [collar]);
  const faded = opacity < 1;
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color,
        transparent: faded,
        opacity,
        depthWrite: !faded,
        roughness: 0.45,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
    [color, opacity, faded]
  );
  const gripMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(color).multiplyScalar(0.85),
        transparent: faded,
        opacity,
        depthWrite: !faded,
        roughness: 0.7,
        side: THREE.DoubleSide,
      }),
    [color, opacity, faded]
  );
  return (
    <group>
      <mesh geometry={parts.shell} material={material} castShadow={!faded} receiveShadow />
      <mesh geometry={parts.grips} material={gripMaterial} castShadow={!faded} />
    </group>
  );
}

/** Closure from a drawing, with y = 0 at the bottom of the skirt. */
export function ClosureModel({
  closure,
  color,
  opacity = 1,
}: {
  closure: ClosureDrawing;
  color: string;
  opacity?: number;
}) {
  const parts = useMemo(() => createClosureGeometries(closure), [closure]);
  const flipTop = useMemo(() => createFlipTopGeometries(closure), [closure]);
  const topTexture = useMemo(() => createClosureTopTexture(closure), [closure]);
  const faded = opacity < 1;
  const glossy = closure.style === 'flip-top';
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color,
        transparent: faded,
        opacity,
        depthWrite: !faded,
        roughness: glossy ? 0.22 : 0.6,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
    [color, opacity, faded, glossy]
  );
  const shadeMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(color).multiplyScalar(0.78),
        transparent: faded,
        opacity,
        depthWrite: !faded,
        roughness: 0.5,
        side: THREE.DoubleSide,
      }),
    [color, opacity, faded]
  );

  return (
    <group>
      <mesh geometry={parts.skirt} material={material} castShadow={!faded} receiveShadow />
      <mesh geometry={parts.band} material={material} castShadow={!faded} />
      <mesh geometry={parts.top} material={material} castShadow={!faded} receiveShadow />
      {flipTop && (
        <>
          <mesh geometry={flipTop.notch} material={shadeMaterial} />
          <mesh geometry={flipTop.hinge} material={material} castShadow={!faded} />
          {!faded && (
            <lineLoop geometry={flipTop.partingLine}>
              <lineBasicMaterial color="#64748b" transparent opacity={0.6} />
            </lineLoop>
          )}
        </>
      )}
      {topTexture && !faded && (
        <mesh geometry={parts.topPanel}>
          <meshStandardMaterial
            map={topTexture}
            transparent
            roughness={0.6}
            polygonOffset
            polygonOffsetFactor={-1}
          />
        </mesh>
      )}
    </group>
  );
}

/**
 * Generate bottle geometry based on shape type.
 * All body geometries are created with their base at y=0.
 */
function generateBottleGeometry(bottle: Bottle) {
  const dims = bottle.dimensions;
  const bodyOnlyHeight = dims.bodyHeight - dims.neckHeight;
  
  let bodyGeometry: THREE.BufferGeometry;
  let neckGeometry: THREE.BufferGeometry;
  let capGeometry: THREE.BufferGeometry;
  
  switch (bottle.shape) {
    case 'boston-round':
      // LatheGeometry already starts at y=0
      bodyGeometry = createBostonRoundBody(dims);
      break;
    case 'cylinder': {
      // CylinderGeometry is centered at origin; translate so bottom is at y=0
      bodyGeometry = new THREE.CylinderGeometry(
        dims.diameter / 2,
        dims.diameter / 2,
        bodyOnlyHeight,
        32
      );
      bodyGeometry.translate(0, bodyOnlyHeight / 2, 0);
      break;
    }
    case 'oval':
      bodyGeometry = createOvalBody(dims);
      break;
    case 'modern-pharmaceutical':
      bodyGeometry = createModernPharmBody(dims);
      break;
    case 'packer':
    case 'wide-mouth':
      // LatheGeometry already starts at y=0
      bodyGeometry = createPackerBody(dims);
      break;
    default: {
      bodyGeometry = new THREE.CylinderGeometry(
        dims.diameter / 2,
        dims.diameter / 2,
        bodyOnlyHeight,
        32
      );
      bodyGeometry.translate(0, bodyOnlyHeight / 2, 0);
      break;
    }
  }
  
  // Neck geometry (common for all shapes) — bottom at y=0, translated up in JSX
  neckGeometry = new THREE.CylinderGeometry(
    dims.neckDiameter / 2,
    dims.neckDiameter / 2,
    dims.neckHeight,
    32
  );
  neckGeometry.translate(0, dims.neckHeight / 2, 0);
  
  // Cap geometry based on style
  capGeometry = createCapGeometry(bottle.capStyle, dims.neckDiameter);
  
  return { bodyGeometry, neckGeometry, capGeometry };
}

/**
 * Create Boston Round bottle body using lathe geometry
 */
function createBostonRoundBody(dims: Bottle['dimensions']): THREE.BufferGeometry {
  const points: THREE.Vector2[] = [];
  const segments = 32;
  
  const bodyRadius = dims.diameter / 2;
  const neckRadius = dims.neckDiameter / 2;
  const bodyHeight = dims.bodyHeight - dims.neckHeight;
  const shoulderHeight = dims.shoulderCurveRadius;
  
  // Base
  points.push(new THREE.Vector2(0, 0));
  points.push(new THREE.Vector2(bodyRadius, 0));
  
  // Body
  points.push(new THREE.Vector2(bodyRadius, bodyHeight - shoulderHeight));
  
  // Shoulder curve
  for (let i = 0; i <= segments / 4; i++) {
    const t = i / (segments / 4);
    const angle = t * Math.PI / 2;
    const r = bodyRadius - (bodyRadius - neckRadius) * Math.sin(angle);
    const h = bodyHeight - shoulderHeight + shoulderHeight * (1 - Math.cos(angle));
    points.push(new THREE.Vector2(r, h));
  }
  
  // Top
  points.push(new THREE.Vector2(neckRadius, bodyHeight));
  points.push(new THREE.Vector2(0, bodyHeight));
  
  return new THREE.LatheGeometry(points, 32);
}

/**
 * Create oval bottle body.
 * Base sits at y=0, top at y=bodyOnlyHeight.
 */
function createOvalBody(dims: Bottle['dimensions']): THREE.BufferGeometry {
  const widthRatio = dims.widthRatio || 0.6;
  const a = dims.diameter / 2;
  const b = a * widthRatio;
  const height = dims.bodyHeight - dims.neckHeight;
  const bevelThickness = Math.min(5, height * 0.05);
  const bevelSize = Math.min(5, a * 0.1);
  
  // Create elliptical cylinder using extrusion
  const shape = new THREE.Shape();
  const segments = 32;
  
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = a * Math.cos(angle);
    const y = b * Math.sin(angle);
    if (i === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  }
  
  const extrudeSettings = {
    depth: height,
    bevelEnabled: true,
    bevelThickness,
    bevelSize,
    bevelSegments: 8,
  };
  
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geometry.rotateX(-Math.PI / 2);
  // After rotation, geometry spans y from -bevelThickness to height+bevelThickness.
  // Shift up so the base sits at y=0.
  geometry.translate(0, bevelThickness, 0);
  
  return geometry;
}

/**
 * Create modern pharmaceutical bottle body (rounded rectangle).
 * Base sits at y=0, top at y=bodyOnlyHeight.
 */
function createModernPharmBody(dims: Bottle['dimensions']): THREE.BufferGeometry {
  const width = dims.diameter;
  const depth = width * (dims.widthRatio || 0.5);
  const height = dims.bodyHeight - dims.neckHeight;
  const radius = Math.min(dims.shoulderCurveRadius, width / 4, depth / 4);
  const bevelThickness = Math.min(3, height * 0.03);
  const bevelSize = Math.min(3, width * 0.05);
  
  // Create rounded rectangle shape
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -depth / 2;
  
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + depth - radius);
  shape.quadraticCurveTo(x + width, y + depth, x + width - radius, y + depth);
  shape.lineTo(x + radius, y + depth);
  shape.quadraticCurveTo(x, y + depth, x, y + depth - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  
  const extrudeSettings = {
    depth: height,
    bevelEnabled: true,
    bevelThickness,
    bevelSize,
    bevelSegments: 4,
  };
  
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geometry.rotateX(-Math.PI / 2);
  // After rotation, geometry spans y from -bevelThickness to height+bevelThickness.
  // Shift up so the base sits at y=0.
  geometry.translate(0, bevelThickness, 0);
  
  return geometry;
}

/**
 * Create packer/wide-mouth bottle body
 */
function createPackerBody(dims: Bottle['dimensions']): THREE.BufferGeometry {
  const points: THREE.Vector2[] = [];
  
  const bodyRadius = dims.diameter / 2;
  const neckRadius = dims.neckDiameter / 2;
  const bodyHeight = dims.bodyHeight - dims.neckHeight;
  const shoulderHeight = dims.shoulderCurveRadius;
  
  // Base
  points.push(new THREE.Vector2(0, 0));
  points.push(new THREE.Vector2(bodyRadius, 0));
  
  // Body (straight sides)
  points.push(new THREE.Vector2(bodyRadius, bodyHeight - shoulderHeight));
  
  // Short shoulder transition
  points.push(new THREE.Vector2(neckRadius, bodyHeight));
  
  // Top
  points.push(new THREE.Vector2(0, bodyHeight));
  
  return new THREE.LatheGeometry(points, 32);
}

/**
 * Create cap geometry based on style
 */
function createCapGeometry(style: Bottle['capStyle'], neckDiameter: number): THREE.BufferGeometry {
  const capRadius = neckDiameter / 2 * 1.2;
  const capHeight = neckDiameter * 0.5;
  
  switch (style) {
    case 'child-resistant':
      // Wider cap with ridges
      return new THREE.CylinderGeometry(
        capRadius * 1.1,
        capRadius * 1.1,
        capHeight * 1.2,
        32
      );
      
    case 'flip-top':
      // Cap with hinge indication
      const flipGeom = new THREE.CylinderGeometry(
        capRadius,
        capRadius,
        capHeight * 0.8,
        32
      );
      return flipGeom;
      
    case 'dropper':
      // Elongated dropper cap
      return new THREE.CylinderGeometry(
        capRadius * 0.7,
        capRadius * 0.5,
        capHeight * 2.5,
        32
      );
      
    case 'pump':
      // Pump dispenser (simplified)
      const pumpGeom = new THREE.CylinderGeometry(
        capRadius * 0.8,
        capRadius,
        capHeight * 2,
        32
      );
      return pumpGeom;
      
    case 'spray':
      // Spray nozzle
      return new THREE.CylinderGeometry(
        capRadius * 0.6,
        capRadius * 0.8,
        capHeight * 1.8,
        32
      );
      
    case 'screw-cap':
    default:
      return new THREE.CylinderGeometry(
        capRadius,
        capRadius,
        capHeight,
        32
      );
  }
}
