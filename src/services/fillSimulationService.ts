/**
 * Fill Simulation Service
 * Core simulation logic for dropping products into bottles.
 * This service provides utility functions used by the SimulationController
 * component which runs inside the React Three Fiber render loop.
 */

import { BottleDimensions, BottleShape, DrawingProfile } from '@/types/bottle';
import { Product } from '@/types/product';
import { v4 as uuidv4 } from 'uuid';
import { insideSection, profileTop, radiusAt } from '@/services/drawingProfile';

/**
 * Generate a random spawn position above the bottle neck.
 * Products are spawned within half the neck inner radius so they drop
 * cleanly through the opening. `minHeight` lets callers lift the spawn
 * point above products already piled up at the neck.
 */
export function getSpawnPosition(
  dims: BottleDimensions,
  minHeight = 0
): [number, number, number] {
  const neckInnerR = Math.max(dims.neckDiameter / 2 - dims.wallThickness, 1) * 0.5;
  const spawnHeight = Math.max(dims.bodyHeight + 30, minHeight);
  
  const angle = Math.random() * Math.PI * 2;
  const r = Math.random() * neckInnerR;
  
  return [
    Math.cos(angle) * r,
    spawnHeight,
    Math.sin(angle) * r,
  ];
}

/**
 * Largest product dimension (mm), used for spawn spacing.
 */
export function getProductMaxDimension(product: Product): number {
  const { length, width, height } = product.dimensions;
  return Math.max(length, width, height);
}

/**
 * Generate a random quaternion for initial product orientation.
 */
export function getRandomRotation(): [number, number, number, number] {
  // Random unit quaternion using Marsaglia's method
  let u1: number, u2: number, s1: number;
  do {
    u1 = Math.random() * 2 - 1;
    u2 = Math.random() * 2 - 1;
    s1 = u1 * u1 + u2 * u2;
  } while (s1 >= 1);
  
  let u3: number, u4: number, s2: number;
  do {
    u3 = Math.random() * 2 - 1;
    u4 = Math.random() * 2 - 1;
    s2 = u3 * u3 + u4 * u4;
  } while (s2 >= 1);
  
  const root = Math.sqrt((1 - s1) / s2);
  return [u1, u2, u3 * root, u4 * root];
}

/**
 * Generate a unique ID for a product body instance.
 */
export function generateBodyId(): string {
  return uuidv4();
}

export type ColliderPrimitiveType = 'cylinder' | 'capsule' | 'cuboid' | 'round-cuboid' | 'ball' | 'convex';

export interface ColliderPart {
  type: ColliderPrimitiveType;
  /** Collider-specific args (Rapier half-extents / radius conventions); flat xyz point list for 'convex'. */
  args: number[];
  /** Optional local offset from the rigid-body origin. */
  position?: [number, number, number];
  /** Optional local Euler rotation in radians [x, y, z]. */
  rotation?: [number, number, number];
}

/**
 * Get the Rapier collider parameters for a product shape.
 * Single-shape products return one part; compounds return multiple offset parts.
 */
export interface ProductColliderParams {
  parts: ColliderPart[];
}

export function getProductColliderParams(product: Product): ProductColliderParams {
  const { shape, dimensions } = product;
  const { length, width, height } = dimensions;
  
  switch (shape) {
    case 'round-tablet':
      // Cylinder: halfHeight, radius
      return {
        parts: [{ type: 'cylinder', args: [height / 2, length / 2] }],
      };
    case 'capsule':
      // Capsule: halfHeight (of cylinder part), radius
      return {
        parts: [{ type: 'capsule', args: [(length - width) / 2, width / 2] }],
      };
    case 'oblong-tablet': {
      // One rounded box for the stadium tablet: a cuboid + two end cylinders
      // made each pile step ~2.5x slower (Rapier cylinders use generic GJK).
      const halfH = height / 2;
      const halfW = width / 2;
      const r = oblongCornerRadius(product);
      return {
        parts: [{ type: 'round-cuboid', args: [length / 2 - r, halfH - r, halfW - r, r] }],
      };
    }
    case 'gummy':
      return {
        parts: [{ type: 'cuboid', args: [length / 2, height / 2, width / 2] }],
      };
    case 'dome':
      return {
        parts: [{ type: 'convex', args: getDomeHullPoints(length, width, height) }],
      };
    case 'gummy-cylinder':
      return {
        parts: [{ type: 'cylinder', args: [height / 2, length / 2] }],
      };
    default:
      return {
        parts: [{ type: 'cuboid', args: [length / 2, height / 2, width / 2] }],
      };
  }
}

/**
 * Points on a half-ellipsoid dome: flat base (length × width) at y = 0, apex at y = height.
 * Kept coarse: contact cost grows quickly with hull vertex count in dense piles.
 */
function getDomeHullPoints(length: number, width: number, height: number): number[] {
  const points: number[] = [];
  const segments = 8;
  const rings = 2;
  for (let r = 0; r < rings; r++) {
    const phi = (r / rings) * (Math.PI / 2);
    const scale = Math.cos(phi);
    const y = height * Math.sin(phi);
    for (let s = 0; s < segments; s++) {
      const theta = (s / segments) * Math.PI * 2;
      points.push(Math.cos(theta) * (length / 2) * scale, y, Math.sin(theta) * (width / 2) * scale);
    }
  }
  points.push(0, height, 0);
  return points;
}

// Shrinks containment samples so products resting against a wall
// (within solver contact tolerance) still count as inside.
const SAMPLE_MARGIN = 0.85;

/**
 * Local-space points used to decide whether a product is inside the bottle.
 */
export function getProductSamplePoints(product: Product): [number, number, number][] {
  const { length, width, height } = product.dimensions;
  const m = SAMPLE_MARGIN;

  if (product.shape === 'dome') {
    // The origin is on the flat base, so lift the rim samples into the body too
    const rimY = height * (1 - m);
    return [
      [0, height * 0.4, 0],
      [(length / 2) * m, rimY, 0],
      [(-length / 2) * m, rimY, 0],
      [0, rimY, (width / 2) * m],
      [0, rimY, (-width / 2) * m],
      [0, height * m, 0],
    ];
  }

  const [hx, hy, hz] = getProductHalfExtents(product).map((v) => v * m);
  return [
    [0, 0, 0],
    [hx, 0, 0],
    [-hx, 0, 0],
    [0, hy, 0],
    [0, -hy, 0],
    [0, 0, hz],
    [0, 0, -hz],
  ];
}

/**
 * Approximate local half-extents for containment sampling.
 */
export function getProductHalfExtents(product: Product): [number, number, number] {
  const { shape, dimensions } = product;
  const { length, width, height } = dimensions;
  
  switch (shape) {
    case 'round-tablet':
    case 'gummy-cylinder':
      return [length / 2, height / 2, length / 2];
    case 'capsule':
      return [length / 2, width / 2, width / 2];
    case 'oblong-tablet':
      return [length / 2, height / 2, width / 2];
    case 'dome':
      return [length / 2, height, width / 2];
    case 'gummy':
    default:
      return [length / 2, height / 2, width / 2];
  }
}

/**
 * Get the Three.js mesh geometry type and args for visual rendering.
 */
export interface ProductMeshParams {
  /** 'rounded-box' args: [length, height, width, cornerRadius] */
  geometryType: 'cylinder' | 'capsule' | 'box' | 'rounded-box' | 'sphere';
  args: number[];
}

/** Edge radius of the oblong-tablet rounded box, shared by collider and mesh. */
function oblongCornerRadius(product: Product): number {
  const { width, height } = product.dimensions;
  return Math.min(height, width) * 0.5 * 0.7;
}

export function getProductMeshParams(product: Product): ProductMeshParams {
  const { shape, dimensions } = product;
  const { length, width, height } = dimensions;
  
  switch (shape) {
    case 'round-tablet':
      return {
        geometryType: 'cylinder',
        args: [length / 2, length / 2, height, 16],
      };
    case 'capsule':
      return {
        geometryType: 'capsule',
        args: [width / 2, length - width, 8, 16],
      };
    case 'oblong-tablet':
      return {
        geometryType: 'rounded-box',
        args: [length, height, width, oblongCornerRadius(product)],
      };
    case 'gummy':
      return {
        geometryType: 'box',
        args: [length, height, width],
      };
    case 'dome':
      return {
        geometryType: 'sphere',
        args: [length / 2, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2],
      };
    case 'gummy-cylinder':
      return {
        geometryType: 'cylinder',
        args: [length / 2, length / 2, height, 16],
      };
    default:
      return {
        geometryType: 'box',
        args: [length, height, width],
      };
  }
}

export interface InsideBottleOptions {
  shape?: BottleShape;
  /** Local-space sample points (product frame); all must be inside. */
  samplePoints?: [number, number, number][];
  /** Body orientation as quaternion [x, y, z, w]. */
  rotation?: [number, number, number, number];
  /** Drawing profile; when set, its outer envelope replaces the parametric shape. */
  profile?: DrawingProfile;
}

/**
 * Transform a local-space point by a quaternion + translation.
 */
function transformLocalPoint(
  local: [number, number, number],
  position: [number, number, number],
  rotation: [number, number, number, number]
): [number, number, number] {
  const [lx, ly, lz] = local;
  const [qx, qy, qz, qw] = rotation;
  
  // q * v
  const ix = qw * lx + qy * lz - qz * ly;
  const iy = qw * ly + qz * lx - qx * lz;
  const iz = qw * lz + qx * ly - qy * lx;
  const iw = -qx * lx - qy * ly - qz * lz;
  
  // (q * v) * q^-1
  return [
    position[0] + ix * qw + iw * -qx + iy * -qz - iz * -qy,
    position[1] + iy * qw + iw * -qy + iz * -qx - ix * -qz,
    position[2] + iz * qw + iw * -qz + ix * -qy - iy * -qx,
  ];
}

/**
 * Check if a single world-space point lies within the bottle's outer envelope.
 * Products can only leave through the neck, so points pressed into the wall or
 * floor by the pile (solver penetration) still count as inside.
 */
export function isPointInsideBottle(
  position: [number, number, number],
  dims: BottleDimensions,
  shape: BottleShape = 'boston-round'
): boolean {
  const [x, y, z] = position;
  const bodyRx = dims.diameter / 2;
  const widthRatio = shape === 'oval' ? (dims.widthRatio ?? 0.6) : 1;
  const bodyRz = bodyRx * widthRatio;
  const neckR = dims.neckDiameter / 2;
  const shoulderHeight = Math.min(
    Math.max(dims.shoulderCurveRadius, 2),
    Math.max((dims.bodyHeight - dims.neckHeight) * 0.45, 2)
  );
  const bodyH = dims.bodyHeight - dims.neckHeight;
  const shoulderStartY = bodyH - shoulderHeight;
  const totalH = dims.bodyHeight;
  
  if (y < 0) return false;
  if (y > totalH * 1.02) return false;
  
  // Neck region (circular)
  if (y >= bodyH) {
    return Math.sqrt(x * x + z * z) <= neckR;
  }
  
  // Shoulder loft: lerp elliptical body → circular neck
  if (y >= shoulderStartY) {
    const t = (y - shoulderStartY) / shoulderHeight;
    const angle = t * (Math.PI / 2);
    const rx = bodyRx - (bodyRx - neckR) * Math.sin(angle);
    const rz = bodyRz - (bodyRz - neckR) * Math.sin(angle);
    if (rx <= 0 || rz <= 0) return false;
    return (x * x) / (rx * rx) + (z * z) / (rz * rz) <= 1;
  }
  
  // Body cavity
  if (bodyRx <= 0 || bodyRz <= 0) return false;
  return (x * x) / (bodyRx * bodyRx) + (z * z) / (bodyRz * bodyRz) <= 1;
}

/** Same envelope test as `isPointInsideBottle`, against a drawing profile. */
const PROFILE_FLOOR_TOLERANCE = 1;

export function isPointInsideProfile(
  position: [number, number, number],
  profile: DrawingProfile
): boolean {
  const [x, y, z] = position;
  const top = profileTop(profile);
  // Drawing walls are thin (<1 mm), so sample points that overhang the
  // collision hull can dip just below the outer base while resting on the floor.
  if (y < -PROFILE_FLOOR_TOLERANCE || y > top * 1.02) return false;
  const floorY = profile.inner[0][1];
  const yc = Math.min(Math.max(y, floorY), top);
  return insideSection(profile.oval, x, z, radiusAt(profile.outer, yc), yc);
}

/**
 * Check if a product body is fully inside the bottle.
 * When samplePoints + rotation are provided, every sample must be inside
 * so partially-through-wall products are not counted as inside.
 */
export function isInsideBottle(
  position: [number, number, number],
  dims: BottleDimensions,
  options?: InsideBottleOptions
): boolean {
  const shape = options?.shape ?? 'boston-round';
  const samplePoints = options?.samplePoints;
  const rotation = options?.rotation ?? [0, 0, 0, 1];
  const profile = options?.profile;
  const inside = (p: [number, number, number]) =>
    profile ? isPointInsideProfile(p, profile) : isPointInsideBottle(p, dims, shape);
  
  if (!samplePoints) {
    return inside(position);
  }
  
  for (const local of samplePoints) {
    const world = transformLocalPoint(local, position, rotation);
    if (!inside(world)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Determine the color for a product based on simulation state.
 */
export function getProductColor(
  baseColor: string,
  isInside: boolean,
  isComplete: boolean
): string {
  if (!isComplete) return baseColor;
  return isInside ? '#22c55e' : '#ef4444'; // green / red
}

/**
 * Calculate fill simulation results.
 */
export function calculateResults(
  targetQuantity: number,
  productBodies: Array<{ isInside: boolean }>,
  product: Product,
  bottleVolumeMl: number,
  simulationTime: number
): {
  targetQuantity: number;
  actualQuantity: number;
  overflow: number;
  fillEfficiency: number;
  bottleVolume: number;
  productVolume: number;
  totalProductVolume: number;
  simulationTime: number;
  productPositions: Array<{ id: string; position: [number, number, number]; rotation: [number, number, number, number]; isInside: boolean }>;
} {
  const actualQuantity = productBodies.filter(b => b.isInside).length;
  const overflow = productBodies.filter(b => !b.isInside).length;
  const productVolumeMm3 = product.volume;
  const totalProductVolumeMm3 = actualQuantity * productVolumeMm3;
  const bottleVolumeInMm3 = bottleVolumeMl * 1000; // ml to mm³
  const fillEfficiency = bottleVolumeInMm3 > 0
    ? (totalProductVolumeMm3 / bottleVolumeInMm3) * 100
    : 0;
  
  return {
    targetQuantity,
    actualQuantity,
    overflow,
    fillEfficiency,
    bottleVolume: bottleVolumeMl,
    productVolume: productVolumeMm3,
    totalProductVolume: totalProductVolumeMm3,
    simulationTime,
    productPositions: [],
  };
}
