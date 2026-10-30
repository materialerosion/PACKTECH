/**
 * Three.js geometry for bottles and closures defined by drawings.
 */

import * as THREE from 'three';
import { ClosureDrawing, DrawingProfile } from '@/types';

const LATHE_SEGMENTS = 96;

/**
 * Closed bottle shell: outside surface up to the lip, then down the bore and
 * cavity, so the opening reads as hollow.
 */
export function createProfileBodyGeometry(profile: DrawingProfile): THREE.BufferGeometry {
  const points = [
    ...profile.outer,
    ...[...profile.inner].reverse(),
  ].map(([r, y]) => new THREE.Vector2(Math.max(r, 0), y));
  return new THREE.LatheGeometry(points, LATHE_SEGMENTS);
}

class HelixCurve extends THREE.Curve<THREE.Vector3> {
  constructor(
    private radius: number,
    private startY: number,
    private endY: number,
    private pitch: number
  ) {
    super();
  }

  getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    const turns = (this.endY - this.startY) / this.pitch;
    const angle = t * turns * Math.PI * 2;
    return target.set(
      Math.cos(angle) * this.radius,
      this.startY + t * (this.endY - this.startY),
      Math.sin(angle) * this.radius
    );
  }
}

export function createThreadGeometry(profile: DrawingProfile): THREE.BufferGeometry | null {
  const thread = profile.thread;
  if (!thread) return null;
  const tube = Math.max((thread.crestRadius - thread.rootRadius) / 2, 0.3);
  const curve = new HelixCurve(thread.crestRadius - tube, thread.startY, thread.endY, thread.pitch);
  return new THREE.TubeGeometry(curve, 160, tube, 8, false);
}

export interface ClosureGeometries {
  skirt: THREE.BufferGeometry;
  band: THREE.BufferGeometry;
  top: THREE.BufferGeometry;
  topPanel: THREE.BufferGeometry;
  topPanelRadius: number;
}

/** Closure parts with y = 0 at the bottom of the skirt. */
export function createClosureGeometries(closure: ClosureDrawing): ClosureGeometries {
  const rTop = closure.topDiameter / 2;
  const rBottom = closure.bottomDiameter / 2;
  const edge = 1.0;
  const band = closure.bottomBandHeight;
  const knurlHeight = closure.height - band - edge;

  // Knurled skirt: alternate vertices around the circumference pulled inward
  const rKnurlBottom = rBottom - (rBottom - rTop) * (band / closure.height);
  const rKnurlTop = rTop;
  const radial = closure.ribCount * 2;
  const skirt = new THREE.CylinderGeometry(rKnurlTop, rKnurlBottom, knurlHeight, radial, 1, true);
  const pos = skirt.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const column = i % (radial + 1);
    if (column % 2 === 1) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const r = Math.hypot(x, z);
      const k = (r - closure.ribDepth) / r;
      pos.setXYZ(i, x * k, pos.getY(i), z * k);
    }
  }
  skirt.computeVertexNormals();
  skirt.translate(0, band + knurlHeight / 2, 0);

  // Depressed plain band at the bottom of the outer cap, closed underneath
  const bandR = rBottom - closure.ribDepth;
  const innerR = bandR - 1.6;
  const bandGeo = new THREE.LatheGeometry(
    [
      new THREE.Vector2(innerR, 0),
      new THREE.Vector2(bandR, 0),
      new THREE.Vector2(bandR, band),
      new THREE.Vector2(rKnurlBottom, band),
    ],
    LATHE_SEGMENTS
  );

  // Rounded top edge and top deck
  const topPoints: THREE.Vector2[] = [];
  const base = closure.height - edge;
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * (Math.PI / 2);
    topPoints.push(new THREE.Vector2(rTop - edge + edge * Math.cos(a), base + edge * Math.sin(a)));
  }
  topPoints.push(new THREE.Vector2(0, closure.height));
  const top = new THREE.LatheGeometry(topPoints, LATHE_SEGMENTS);

  const topPanelRadius = rTop - edge - 0.3;
  const topPanel = new THREE.CircleGeometry(topPanelRadius, LATHE_SEGMENTS);
  topPanel.rotateX(-Math.PI / 2);
  topPanel.translate(0, closure.height + 0.02, 0);

  return { skirt, band: bandGeo, top, topPanel, topPanelRadius };
}

function arcText(
  ctx: CanvasRenderingContext2D,
  text: string,
  radius: number,
  onTop: boolean
) {
  const widths = [...text].map((ch) => ctx.measureText(ch).width * 1.08);
  const total = widths.reduce((a, b) => a + b, 0) / radius;
  let angle = onTop ? -Math.PI / 2 - total / 2 : Math.PI / 2 + total / 2;
  [...text].forEach((ch, i) => {
    const step = widths[i] / radius;
    angle += onTop ? step / 2 : -step / 2;
    ctx.save();
    ctx.rotate(onTop ? angle + Math.PI / 2 : angle - Math.PI / 2);
    ctx.fillText(ch, 0, onTop ? -radius : radius);
    ctx.restore();
    angle += onTop ? step / 2 : -step / 2;
  });
}

function arrow(ctx: CanvasRenderingContext2D, radius: number, from: number, to: number) {
  ctx.beginPath();
  ctx.arc(0, 0, radius, from, to, to < from);
  ctx.stroke();
  const dir = to > from ? 1 : -1;
  const tip = [Math.cos(to) * radius, Math.sin(to) * radius];
  const tangent = [-Math.sin(to) * dir, Math.cos(to) * dir];
  const normal = [Math.cos(to), Math.sin(to)];
  const size = radius * 0.14;
  ctx.beginPath();
  ctx.moveTo(tip[0] + tangent[0] * size, tip[1] + tangent[1] * size);
  ctx.lineTo(tip[0] + normal[0] * size * 0.6, tip[1] + normal[1] * size * 0.6);
  ctx.lineTo(tip[0] - normal[0] * size * 0.6, tip[1] - normal[1] * size * 0.6);
  ctx.closePath();
  ctx.fill();
}

/** Embossed top-panel artwork as a transparent texture. */
export function createClosureTopTexture(closure: ClosureDrawing): THREE.CanvasTexture | null {
  if (!closure.topText || typeof document === 'undefined') return null;
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const R = size / 2;
  ctx.translate(R, R);
  ctx.fillStyle = 'rgba(40, 40, 40, 0.30)';
  ctx.strokeStyle = 'rgba(40, 40, 40, 0.30)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.93, 0, Math.PI * 2);
  ctx.stroke();

  ctx.font = `bold ${Math.round(R * 0.15)}px Arial, Helvetica, sans-serif`;
  arcText(ctx, closure.topText.arcTop, R * 0.74, true);
  arcText(ctx, closure.topText.arcBottom, R * 0.74, false);

  ctx.font = `bold ${Math.round(R * 0.17)}px Arial, Helvetica, sans-serif`;
  const lines = closure.topText.center;
  lines.forEach((line, i) => {
    ctx.fillText(line, 0, (i - (lines.length - 1) / 2) * R * 0.3);
  });

  ctx.lineWidth = R * 0.035;
  arrow(ctx, R * 0.6, Math.PI * 1.08, Math.PI * 0.86);
  arrow(ctx, R * 0.6, -Math.PI * 0.08, Math.PI * 0.14);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
