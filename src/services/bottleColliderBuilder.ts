/**
 * Bottle Collider Builder
 * Builds trimesh geometry data from bottle dimensions for Rapier physics colliders.
 * Generates a hollow open-top bottle: floor, body shell, shoulder loft, neck shell.
 * Supports circular and oval (elliptical) body cross-sections.
 */

import { Bottle, BottleDimensions, BottleShape, DrawingProfile } from '@/types/bottle';

export interface ColliderGeometry {
  vertices: Float32Array;
  indices: Uint32Array;
}

const SEGMENTS = 48; // Radial segments for wall contact fidelity
const SHOULDER_STEPS = 8; // Rings in the shoulder loft

/**
 * Floor slab thickness used by both the trimesh and inside-tests.
 */
export function getFloorThickness(dims: BottleDimensions): number {
  const fromWall = Math.max(dims.wallThickness * 3, 3);
  const fromBase = (dims.baseIndentDepth ?? 0) + dims.wallThickness;
  return Math.max(fromWall, fromBase);
}

/**
 * Shoulder loft height clamped so it fits within the body.
 */
export function getShoulderHeight(dims: BottleDimensions): number {
  const bodyOnly = dims.bodyHeight - dims.neckHeight;
  const requested = Math.max(dims.shoulderCurveRadius || 0, 2);
  return Math.min(requested, Math.max(bodyOnly * 0.45, 2));
}

/**
 * Body outer radii (X = major, Z = minor). Circular when not oval.
 */
export function getBodyOuterRadii(
  dims: BottleDimensions,
  shape: BottleShape
): { rx: number; rz: number } {
  const rx = dims.diameter / 2;
  const widthRatio = shape === 'oval' ? (dims.widthRatio ?? 0.6) : 1;
  return { rx, rz: rx * widthRatio };
}

/**
 * Generate an elliptical (or circular) ring of vertices at a given height.
 */
function generateRing(
  vertices: number[],
  radiusX: number,
  radiusZ: number,
  y: number,
  segments: number
): void {
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    vertices.push(
      Math.cos(angle) * radiusX,
      y,
      Math.sin(angle) * radiusZ
    );
  }
}

/**
 * Connect two rings of vertices with triangles.
 */
function connectRings(
  indices: number[],
  ring1Start: number,
  ring2Start: number,
  segments: number,
  reverse = false
): void {
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    const a = ring1Start + i;
    const b = ring1Start + next;
    const c = ring2Start + i;
    const d = ring2Start + next;
    
    if (reverse) {
      indices.push(a, b, c);
      indices.push(b, d, c);
    } else {
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }
}

/**
 * Generate a solid elliptical disc at a given height.
 */
function generateDisc(
  vertices: number[],
  indices: number[],
  radiusX: number,
  radiusZ: number,
  y: number,
  segments: number,
  reverse = false
): void {
  const centerIdx = vertices.length / 3;
  vertices.push(0, y, 0);
  
  const ringStart = vertices.length / 3;
  generateRing(vertices, radiusX, radiusZ, y, segments);
  
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    if (reverse) {
      indices.push(centerIdx, ringStart + next, ringStart + i);
    } else {
      indices.push(centerIdx, ringStart + i, ringStart + next);
    }
  }
}

/**
 * Generate an annulus connecting two elliptical radii at a given height.
 */
function generateAnnulus(
  vertices: number[],
  indices: number[],
  innerRx: number,
  innerRz: number,
  outerRx: number,
  outerRz: number,
  y: number,
  segments: number,
  reverse = false
): void {
  const outerStart = vertices.length / 3;
  generateRing(vertices, outerRx, outerRz, y, segments);
  
  const innerStart = vertices.length / 3;
  generateRing(vertices, innerRx, innerRz, y, segments);
  
  connectRings(indices, outerStart, innerStart, segments, reverse);
}

/**
 * Shoulder radius at parameter t ∈ [0,1] (quarter-ellipse loft like Bottle3D).
 */
function shoulderRadiiAt(
  t: number,
  bodyRx: number,
  bodyRz: number,
  neckR: number
): { rx: number; rz: number } {
  const angle = t * (Math.PI / 2);
  const s = Math.sin(angle);
  return {
    rx: bodyRx - (bodyRx - neckR) * s,
    rz: bodyRz - (bodyRz - neckR) * s,
  };
}

export interface BuildBottleColliderOptions {
  shape?: BottleShape;
}

/**
 * Build the complete bottle collider geometry from bottle dimensions.
 * Returns vertices and indices suitable for Rapier trimesh collider.
 */
export function buildBottleColliderGeometry(
  dims: BottleDimensions,
  options: BuildBottleColliderOptions = {}
): ColliderGeometry {
  const shape = options.shape ?? 'boston-round';
  const vertices: number[] = [];
  const indices: number[] = [];
  
  const wt = dims.wallThickness;
  const { rx: bodyOuterRx, rz: bodyOuterRz } = getBodyOuterRadii(dims, shape);
  const bodyInnerRx = Math.max(bodyOuterRx - wt, 0.5);
  const bodyInnerRz = Math.max(bodyOuterRz - wt, 0.5);
  const neckOuterR = dims.neckDiameter / 2;
  const neckInnerR = Math.max(neckOuterR - wt, 0.5);
  
  const floorThickness = getFloorThickness(dims);
  const shoulderHeight = getShoulderHeight(dims);
  
  const floorBottomY = 0;
  const floorTopY = floorThickness;
  const bodyH = dims.bodyHeight - dims.neckHeight;
  const shoulderStartY = bodyH - shoulderHeight;
  const neckTopY = dims.bodyHeight;
  
  // 1. Floor bottom disc
  generateDisc(vertices, indices, bodyOuterRx, bodyOuterRz, floorBottomY, SEGMENTS);
  
  // 1b. Floor top (inner cavity floor)
  generateDisc(vertices, indices, bodyInnerRx, bodyInnerRz, floorTopY, SEGMENTS, true);
  
  // 1c. Floor outer wall
  const floorOuterBottomStart = vertices.length / 3;
  generateRing(vertices, bodyOuterRx, bodyOuterRz, floorBottomY, SEGMENTS);
  const floorOuterTopStart = vertices.length / 3;
  generateRing(vertices, bodyOuterRx, bodyOuterRz, floorTopY, SEGMENTS);
  connectRings(indices, floorOuterBottomStart, floorOuterTopStart, SEGMENTS);
  
  // 2. Floor annulus (outer → inner at floor top)
  generateAnnulus(
    vertices, indices,
    bodyInnerRx, bodyInnerRz,
    bodyOuterRx, bodyOuterRz,
    floorTopY, SEGMENTS
  );
  
  // 3. Body outer wall (floor → shoulder start)
  const bodyOuterBottomStart = vertices.length / 3;
  generateRing(vertices, bodyOuterRx, bodyOuterRz, floorBottomY, SEGMENTS);
  const bodyOuterShoulderStart = vertices.length / 3;
  generateRing(vertices, bodyOuterRx, bodyOuterRz, shoulderStartY, SEGMENTS);
  connectRings(indices, bodyOuterBottomStart, bodyOuterShoulderStart, SEGMENTS);
  
  // 4. Body inner wall (floor top → shoulder start), reversed winding
  const bodyInnerBottomStart = vertices.length / 3;
  generateRing(vertices, bodyInnerRx, bodyInnerRz, floorTopY, SEGMENTS);
  const bodyInnerShoulderStart = vertices.length / 3;
  generateRing(vertices, bodyInnerRx, bodyInnerRz, shoulderStartY, SEGMENTS);
  connectRings(indices, bodyInnerShoulderStart, bodyInnerBottomStart, SEGMENTS);
  
  // 5–6. Shoulder loft (outer + inner), multi-ring quarter-ellipse
  let prevOuterStart = bodyOuterShoulderStart;
  let prevInnerStart = bodyInnerShoulderStart;
  let lastOuterStart = bodyOuterShoulderStart;
  let lastInnerStart = bodyInnerShoulderStart;
  
  for (let step = 1; step <= SHOULDER_STEPS; step++) {
    const t = step / SHOULDER_STEPS;
    // Match Bottle3D: h = start + shoulderHeight * (1 - cos(angle))
    const ringY = shoulderStartY + shoulderHeight * (1 - Math.cos(t * (Math.PI / 2)));
    
    const outer = shoulderRadiiAt(t, bodyOuterRx, bodyOuterRz, neckOuterR);
    const inner = shoulderRadiiAt(t, bodyInnerRx, bodyInnerRz, neckInnerR);
    
    const outerStart = vertices.length / 3;
    generateRing(vertices, outer.rx, outer.rz, ringY, SEGMENTS);
    connectRings(indices, prevOuterStart, outerStart, SEGMENTS);
    prevOuterStart = outerStart;
    lastOuterStart = outerStart;
    
    const innerRx = Math.max(inner.rx, 0.5);
    const innerRz = Math.max(inner.rz, 0.5);
    const innerStart = vertices.length / 3;
    generateRing(vertices, innerRx, innerRz, ringY, SEGMENTS);
    connectRings(indices, innerStart, prevInnerStart, SEGMENTS); // reversed for inward normal
    prevInnerStart = innerStart;
    lastInnerStart = innerStart;
  }
  
  // 7. Shoulder top annulus (reuse last loft rings)
  connectRings(indices, lastOuterStart, lastInnerStart, SEGMENTS);
  
  // 8. Neck outer wall (from last outer shoulder ring)
  const neckOuterTopStart = vertices.length / 3;
  generateRing(vertices, neckOuterR, neckOuterR, neckTopY, SEGMENTS);
  connectRings(indices, lastOuterStart, neckOuterTopStart, SEGMENTS);
  
  // 9. Neck inner wall
  const neckInnerTopStart = vertices.length / 3;
  generateRing(vertices, neckInnerR, neckInnerR, neckTopY, SEGMENTS);
  connectRings(indices, neckInnerTopStart, lastInnerStart, SEGMENTS);
  
  // 10. Top rim annulus
  generateAnnulus(
    vertices, indices,
    neckInnerR, neckInnerR,
    neckOuterR, neckOuterR,
    neckTopY, SEGMENTS
  );
  
  return {
    vertices: new Float32Array(vertices),
    indices: new Uint32Array(indices),
  };
}

/**
 * Single-surface collision shell: inner body wall, inner shoulder, inner neck and
 * top rim, without the floor (use a box collider at getFloorThickness instead).
 * Outer surfaces sit within contact-prediction distance of the inner ones, so
 * including them roughly doubles contacts and adds wrong-facing normals; the
 * floor fan alone puts dozens of triangles under a centred product.
 */
export function buildBottleCollisionShell(
  dims: BottleDimensions,
  options: BuildBottleColliderOptions = {}
): ColliderGeometry {
  const shape = options.shape ?? 'boston-round';
  const vertices: number[] = [];
  const indices: number[] = [];

  const wt = dims.wallThickness;
  const { rx: bodyOuterRx, rz: bodyOuterRz } = getBodyOuterRadii(dims, shape);
  const bodyInnerRx = Math.max(bodyOuterRx - wt, 0.5);
  const bodyInnerRz = Math.max(bodyOuterRz - wt, 0.5);
  const neckOuterR = dims.neckDiameter / 2;
  const neckInnerR = Math.max(neckOuterR - wt, 0.5);

  const floorTopY = getFloorThickness(dims);
  const shoulderHeight = getShoulderHeight(dims);
  const shoulderStartY = dims.bodyHeight - dims.neckHeight - shoulderHeight;
  const neckTopY = dims.bodyHeight;

  // Start the wall slightly below the floor top so the seam can't leak
  const wallBottomStart = vertices.length / 3;
  generateRing(vertices, bodyInnerRx, bodyInnerRz, floorTopY - wt, SEGMENTS);
  let prevStart = vertices.length / 3;
  generateRing(vertices, bodyInnerRx, bodyInnerRz, shoulderStartY, SEGMENTS);
  connectRings(indices, prevStart, wallBottomStart, SEGMENTS);

  for (let step = 1; step <= SHOULDER_STEPS; step++) {
    const t = step / SHOULDER_STEPS;
    const ringY = shoulderStartY + shoulderHeight * (1 - Math.cos(t * (Math.PI / 2)));
    const inner = shoulderRadiiAt(t, bodyInnerRx, bodyInnerRz, neckInnerR);
    const start = vertices.length / 3;
    generateRing(vertices, Math.max(inner.rx, 0.5), Math.max(inner.rz, 0.5), ringY, SEGMENTS);
    connectRings(indices, start, prevStart, SEGMENTS);
    prevStart = start;
  }

  const neckTopStart = vertices.length / 3;
  generateRing(vertices, neckInnerR, neckInnerR, neckTopY, SEGMENTS);
  connectRings(indices, neckTopStart, prevStart, SEGMENTS);

  generateAnnulus(
    vertices, indices,
    neckInnerR, neckInnerR,
    neckOuterR, neckOuterR,
    neckTopY, SEGMENTS
  );

  return {
    vertices: new Float32Array(vertices),
    indices: new Uint32Array(indices),
  };
}

/**
 * Collision shell for a drawing profile: the cavity wall from the floor edge up
 * the bore, plus the top rim. The floor is left to a box collider at
 * `profile.inner[0][1]`.
 */
export function buildProfileCollisionShell(profile: DrawingProfile): ColliderGeometry {
  const vertices: number[] = [];
  const indices: number[] = [];
  const wall = profile.inner.filter(([r]) => r > 0.01);
  const t = profile.wallThickness;

  const [firstR, firstY] = wall[0];
  let prevStart = vertices.length / 3;
  generateRing(vertices, firstR, firstR, firstY - t, SEGMENTS);
  for (const [r, y] of wall) {
    const start = vertices.length / 3;
    generateRing(vertices, r, r, y, SEGMENTS);
    connectRings(indices, start, prevStart, SEGMENTS);
    prevStart = start;
  }

  const [boreR, topY] = wall[wall.length - 1];
  const outerTopR = profile.outer.reduce(
    (m, [r, y]) => (y >= topY - 3 ? Math.max(m, r) : m),
    boreR
  );
  generateAnnulus(vertices, indices, boreR, boreR, outerTopR, outerTopR, topY, SEGMENTS);

  return {
    vertices: new Float32Array(vertices),
    indices: new Uint32Array(indices),
  };
}

/**
 * Convenience builder from a full Bottle (shape-aware).
 */
export function buildBottleColliderFromBottle(bottle: Bottle): ColliderGeometry {
  return buildBottleColliderGeometry(bottle.dimensions, { shape: bottle.shape });
}
