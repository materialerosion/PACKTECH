/**
 * Bottle Type Definitions
 * Core types for pharmaceutical bottle modeling
 */

export type BottleShape = 
  | 'boston-round'
  | 'cylinder'
  | 'oval'
  | 'modern-pharmaceutical'
  | 'packer'
  | 'wide-mouth';

export type CapStyle = 
  | 'screw-cap'
  | 'child-resistant'
  | 'flip-top'
  | 'dropper'
  | 'pump'
  | 'spray';

export type BaseProfile = 
  | 'flat'
  | 'concave'
  | 'convex'
  | 'petaloid';

export type BottleMaterial = 'HDPE' | 'PET' | 'glass' | 'PP';

export interface BottleDimensions {
  // Primary dimensions (mm)
  height: number;              // Total height including cap
  bodyHeight: number;          // Body height without cap
  diameter: number;            // Maximum body diameter
  
  // Neck dimensions (mm)
  neckHeight: number;
  neckDiameter: number;
  neckFinish: string;          // e.g., "28-400", "33-400"
  
  // Shoulder parameters
  shoulderCurveRadius: number;
  shoulderAngle: number;       // degrees
  
  // Base parameters
  baseProfile: BaseProfile;
  baseDiameter: number;
  baseIndentDepth: number;     // For concave bases
  
  // For oval bottles
  widthRatio?: number;         // Width to depth ratio (0-1)
  
  // Wall thickness (for volume calculation)
  wallThickness: number;
}

export interface LabelZone {
  id: string;
  name: string;
  topOffset: number;           // mm from shoulder
  height: number;              // mm
  wrapAngle: number;           // degrees (360 for full wrap)
  color?: string;              // Preview color
}

/** Printed wrap label applied to the straight wall of a drawing bottle. */
export interface LabelArtwork {
  source: string;
  /** Flat artwork image, left edge to right edge as printed. */
  imageUrl: string;
  width: number;               // mm, around the circumference
  height: number;              // mm
  /** Base of the bottle to the bottom label edge; defaults to centred on the label panel. */
  bottomY?: number;
  /** Fraction of the label width (0-1) that faces the front of the bottle. */
  frontCenter?: number;
  /** Face stock finish. */
  finish?: 'gloss' | 'matte';
}

export interface Bottle {
  id: string;
  name: string;
  shape: BottleShape;
  dimensions: BottleDimensions;
  capStyle: CapStyle;
  capColor: string;
  bodyColor: string;
  material: BottleMaterial;
  opacity: number;             // 0-1 for transparency
  labelZones: LabelZone[];
  
  // Resin
  plasticWeight?: number;      // g
  weightTolerance?: number;    // ± g

  // Exact geometry from a supplier drawing; overrides the parametric shape
  profile?: DrawingProfile;
  closure?: ClosureDrawing;
  /** Second component snapped over the shoulder (2-piece bottles). */
  collar?: CollarDrawing;
  label?: LabelArtwork;

  // Calculated values
  volume: number;              // ml (calculated)
  surfaceArea: number;         // cm² (calculated)
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  isCustom: boolean;
  presetId?: string;
}

/** Point on a revolved profile: [radius, height] in mm, base at height 0. */
export type ProfilePoint = [number, number];

/**
 * Bottle geometry traced from a 2D drawing. Both point lists run bottom to top
 * with non-decreasing height.
 */
export interface DrawingProfile {
  source: string;
  /** Outside surface, from the base centre (r = 0) to the top of the finish. */
  outer: ProfilePoint[];
  /** Cavity, from the floor centre (r = 0) to the top of the bore. */
  inner: ProfilePoint[];
  /** Body wall thickness used to derive `inner` (mm). */
  wallThickness: number;
  thread?: {
    rootRadius: number;
    crestRadius: number;
    startY: number; // lowest point of the helix
    endY: number;   // highest point of the helix
    pitch: number;  // lead: rise per turn of one start
    /** Thread starts, evenly spaced (double lead = 2). */
    starts?: number;
  };
  labelPanel?: { bottomY: number; height: number };
  /**
   * Oval body: the profile is the major (x) axis and the body section is an
   * ellipse of depth/width `depthRatio`. The shoulder is lofted from `endY`
   * (narrow ends) and `faceY` (label faces) up to the round neck at `topY`.
   * Bottles saved before the loft have no `shoulder` and render as plain
   * ellipses.
   */
  oval?: {
    depthRatio: number;
    neckRadius: number;
    /** `power` 1 makes a straight cone all round; by default the faces roll over. */
    shoulder?: { bodyRadius: number; endY: number; faceY: number; topY: number; power?: number };
  };
}

/** Closure geometry traced from a 2D drawing (mm). */
/**
 * Oval shroud snapped over the bottle shoulder: lofted straight from an
 * elliptical base to a round top, with grip tabs on the narrow ends.
 */
export interface CollarDrawing {
  source: string;
  material: string;
  /** Major and minor axes of the base ellipse. */
  baseWidth: number;
  baseDepth: number;
  /** Outside diameter of the flat top. */
  topDiameter: number;
  /** Hole through the top, over the finish. */
  holeDiameter: number;
  /** Base to the flat top (tab step height). */
  height: number;
  /** Tabs stand this far above the top. */
  tabHeight: number;
  wallThickness: number;
  /** Height on the bottle where the collar base sits. */
  seatY: number;
}

export interface ClosureDrawing {
  source: string;
  topDiameter: number;
  bottomDiameter: number;
  height: number;
  /** Plain band at the bottom of the skirt, below the knurl. */
  bottomBandHeight: number;
  ribCount: number;
  ribDepth: number;
  /** How far the skirt reaches below the top of the bottle finish. */
  skirtDepth: number;
  /** Lines embossed on the top panel, outer ring first. */
  topText?: { arcTop: string; arcBottom: string; center: string[] };
  /** Embossed instruction graphic in place of text. */
  topPictorial?: 'push-and-turn';
  material: string;
  /** Defaults to a knurled child-resistant shell. */
  style?: 'child-resistant' | 'flip-top';
  flipTop?: {
    /** Height of the hinged lid, measured down from the top. */
    lidHeight: number;
    /** Chord width of the thumb notch at the front of the lid. */
    notchWidth: number;
    /** Radius of the recessed custom-logo area on the lid. */
    logoRadius: number;
  };
}

// Default bottle dimensions for different shapes
export const DEFAULT_DIMENSIONS: Record<BottleShape, BottleDimensions> = {
  'boston-round': {
    height: 90,
    bodyHeight: 85,
    diameter: 45,
    neckHeight: 5,
    neckDiameter: 37,
    neckFinish: '28-400',
    shoulderCurveRadius: 4,
    shoulderAngle: 45,
    baseProfile: 'flat',
    baseDiameter: 45,
    baseIndentDepth: 0,
    wallThickness: 1.5,
  },
  'cylinder': {
    height: 120,
    bodyHeight: 105,
    diameter: 50,
    neckHeight: 15,
    neckDiameter: 24,
    neckFinish: '28-400',
    shoulderCurveRadius: 5,
    shoulderAngle: 90,
    baseProfile: 'flat',
    baseDiameter: 50,
    baseIndentDepth: 0,
    wallThickness: 1.5,
  },
  'oval': {
    height: 110,
    bodyHeight: 95,
    diameter: 55,
    neckHeight: 15,
    neckDiameter: 24,
    neckFinish: '28-400',
    shoulderCurveRadius: 12,
    shoulderAngle: 40,
    baseProfile: 'flat',
    baseDiameter: 55,
    baseIndentDepth: 0,
    widthRatio: 0.6,
    wallThickness: 1.5,
  },
  'modern-pharmaceutical': {
    height: 130,
    bodyHeight: 115,
    diameter: 60,
    neckHeight: 15,
    neckDiameter: 28,
    neckFinish: '33-400',
    shoulderCurveRadius: 8,
    shoulderAngle: 60,
    baseProfile: 'flat',
    baseDiameter: 60,
    baseIndentDepth: 0,
    widthRatio: 0.5,
    wallThickness: 2.0,
  },
  'packer': {
    height: 95,
    bodyHeight: 80,
    diameter: 55,
    neckHeight: 15,
    neckDiameter: 38,
    neckFinish: '38-400',
    shoulderCurveRadius: 10,
    shoulderAngle: 70,
    baseProfile: 'flat',
    baseDiameter: 55,
    baseIndentDepth: 0,
    wallThickness: 2.0,
  },
  'wide-mouth': {
    height: 85,
    bodyHeight: 70,
    diameter: 60,
    neckHeight: 15,
    neckDiameter: 53,
    neckFinish: '53-400',
    shoulderCurveRadius: 8,
    shoulderAngle: 80,
    baseProfile: 'flat',
    baseDiameter: 60,
    baseIndentDepth: 0,
    wallThickness: 2.0,
  },
};

// Shape display names
export const SHAPE_NAMES: Record<BottleShape, string> = {
  'boston-round': 'Boston Round',
  'cylinder': 'Cylinder',
  'oval': 'Oval',
  'modern-pharmaceutical': 'Modern Pharmaceutical',
  'packer': 'Packer',
  'wide-mouth': 'Wide Mouth',
};

// Cap style display names
export const CAP_STYLE_NAMES: Record<CapStyle, string> = {
  'screw-cap': 'Screw Cap',
  'child-resistant': 'Child Resistant',
  'flip-top': 'Flip Top',
  'dropper': 'Dropper',
  'pump': 'Pump Dispenser',
  'spray': 'Spray Nozzle',
};

// Material display names
export const MATERIAL_NAMES: Record<BottleMaterial, string> = {
  'HDPE': 'HDPE (High-Density Polyethylene)',
  'PET': 'PET (Polyethylene Terephthalate)',
  'glass': 'Glass',
  'PP': 'PP (Polypropylene)',
};
