/**
 * Product Presets
 * Pre-configured pharmaceutical product definitions for fill simulation
 */

import { Product, ProductShape } from '@/types/product';
import { v4 as uuidv4 } from 'uuid';

/**
 * Calculate approximate volume for a product based on its shape and dimensions.
 * All dimensions in mm, volume returned in mm³.
 */
export function calculateProductVolume(
  shape: ProductShape,
  length: number,
  width: number,
  height: number
): number {
  switch (shape) {
    case 'round-tablet': {
      // Cylinder: π * r² * h
      const r = length / 2;
      return Math.PI * r * r * height;
    }
    case 'capsule': {
      // Capsule: cylinder + two hemispheres
      const r = width / 2;
      const cylinderLength = length - width; // subtract the two end-cap radii
      const cylinderVol = Math.PI * r * r * cylinderLength;
      const sphereVol = (4 / 3) * Math.PI * r * r * r;
      return cylinderVol + sphereVol;
    }
    case 'oblong-tablet': {
      // Approximate as capsule shape
      const r = height / 2;
      const cylLen = length - height;
      const cylVol = Math.PI * r * r * cylLen;
      const sphVol = (4 / 3) * Math.PI * r * r * r;
      return cylVol + sphVol;
    }
    case 'gummy': {
      // Cuboid approximation
      return length * width * height;
    }
    case 'dome': {
      // Semi-sphere (oblate spheroid half): V = (2/3) * π * (d/2)² * h
      // where d = length (diameter), h = height
      const r = length / 2;
      return (2 / 3) * Math.PI * r * r * height;
    }
    case 'gummy-cylinder': {
      // Cylinder: π * r² * h
      // where d = length (diameter), h = height
      const cylR = length / 2;
      return Math.PI * cylR * cylR * height;
    }
    default:
      return length * width * height;
  }
}

/**
 * Create a product from parameters, auto-calculating volume.
 */
export function createProduct(
  name: string,
  shape: ProductShape,
  length: number,
  width: number,
  height: number,
  mass: number,
  color: string,
  extras: Pick<Product, 'group' | 'massEstimated' | 'specVolumeCc' | 'colorMix'> = {}
): Product {
  return {
    id: uuidv4(),
    name,
    shape,
    dimensions: { length, width, height },
    mass,
    color,
    volume: calculateProductVolume(shape, length, width, height),
    ...extras,
  };
}

// Typical densities (g/cm³) used when only dimensions are known
const DENSITY_GUMMY = 1.3;
const DENSITY_TABLET = 1.2;

/**
 * Create a product whose mass is estimated from its shape volume and a density.
 */
function createEstimatedProduct(
  group: string,
  name: string,
  shape: ProductShape,
  length: number,
  width: number,
  height: number,
  density: number,
  color: string | NonNullable<Product['colorMix']>,
  specVolumeCc: number
): Product {
  const volumeCc = calculateProductVolume(shape, length, width, height) / 1000;
  const mass = Math.round(volumeCc * density * 100) / 100;
  const colorMix = typeof color === 'string' ? undefined : color;
  return createProduct(name, shape, length, width, height, mass, colorMix ? colorMix[0].color : (color as string), {
    group,
    massEstimated: true,
    specVolumeCc,
    colorMix,
  });
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const average = (values: number[]) => round2(values.reduce((a, b) => a + b, 0) / values.length);

/**
 * Bayer products from the "Gummies & Fruit Bite Sizes" and
 * "Chewables, Tablets & Pill Sizes" slides (average L × W × H, mm).
 * Multi-color products are one size (the size most colors share) with a random color mix;
 * spec CC is the average across colors.
 */
const BAYER_PRODUCTS: Product[] = [
  // Slide sizes: Purple 18×17×10, Red 18×16×10, Green 18×17×11
  createEstimatedProduct('Gummies', 'Mens VitaCraves', 'dome', 18, 17, 10, DENSITY_GUMMY, [
    { name: 'Purple', color: '#2B2233' },
    { name: 'Red', color: '#C8102E' },
    { name: 'Green', color: '#1E5631' },
  ], average([2.99, 3.07, 3.57])),

  // Slide sizes: Purple 17×17×10, Red 18×17×10, Orange Slice 20×13×10 (slice modelled as a dome)
  createEstimatedProduct('Gummies', 'Womens VitaCraves', 'dome', 18, 17, 10, DENSITY_GUMMY, [
    { name: 'Purple', color: '#3A2430' },
    { name: 'Red', color: '#D0202E' },
    { name: 'Orange Slice', color: '#F28C28' },
  ], average([2.96, 3.01, 2.57])),

  // Slide sizes: Green 18×17×12, Red 18×17×11, Teal 18×17×11
  createEstimatedProduct('Gummies', 'Teens VitaCraves', 'dome', 18, 17, 11, DENSITY_GUMMY, [
    { name: 'Green', color: '#9BB547' },
    { name: 'Red', color: '#C0392B' },
    { name: 'Teal', color: '#1A8C7E' },
  ], average([3.53, 3.3, 3.47])),

  createEstimatedProduct('Gummies', 'Fruit Bites', 'gummy', 19, 19, 5, DENSITY_GUMMY, '#8B3A2B', 1.81),

  // Slide sizes: Red 19×11×8, Purple 19×10×8, Orange 19×10×8
  createEstimatedProduct('Chewables', 'Flintstones Chewables', 'gummy', 19, 10, 8, DENSITY_TABLET, [
    { name: 'Red', color: '#D9685A' },
    { name: 'Purple', color: '#6B5A6E' },
    { name: 'Orange', color: '#D9832B' },
  ], average([1.5, 1.46, 1.5])),

  createEstimatedProduct('Tablets & Softgels', 'Mens Tablet', 'oblong-tablet', 19, 9, 7, DENSITY_TABLET, '#EFEBDD', 1.22),
  createEstimatedProduct('Tablets & Softgels', 'Womens Tablet', 'oblong-tablet', 22, 9, 7, DENSITY_TABLET, '#E8C77A', 1.44),
  createEstimatedProduct('Tablets & Softgels', 'Prenatal Softgel', 'capsule', 24, 10, 10, DENSITY_TABLET, '#7A1010', 1.88),
];

/**
 * Product presets for common pharmaceutical products.
 * Dimensions in mm, mass in grams.
 */
export const PRODUCT_PRESETS: Product[] = [
  createProduct('Small Round Tablet', 'round-tablet', 8, 8, 3.5, 0.3, '#FFFFFF'),
  createProduct('Medium Round Tablet', 'round-tablet', 10, 10, 4.5, 0.5, '#F5F5DC'),
  createProduct('Large Round Tablet', 'round-tablet', 13, 13, 5.5, 0.8, '#FFFDD0'),
  createProduct('Standard Capsule (Size 0)', 'capsule', 21.7, 7.65, 7.65, 0.5, '#C41E3A'),
  createProduct('Large Capsule (Size 00)', 'capsule', 23.3, 8.53, 8.53, 0.7, '#1E3A5F'),
  createProduct('Oblong Tablet', 'oblong-tablet', 18, 8, 6, 0.9, '#FFFFFF'),
  createProduct('Softgel', 'capsule', 20, 8, 8, 0.8, '#DAA520'),
  createProduct('Gummy Bear', 'gummy', 15, 12, 8, 1.5, '#FF6347'),
  createProduct('Gummy Vitamin', 'gummy', 18, 14, 10, 2.0, '#FFA500'),
  createProduct('Dome Gummy', 'dome', 16, 16, 10, 1.8, '#FF69B4'),
  createProduct('Cylinder Gummy', 'gummy-cylinder', 14, 14, 10, 1.6, '#9370DB'),
  ...BAYER_PRODUCTS,
];

/**
 * Get a fresh copy of a preset (with new ID) for use in simulation.
 */
export function getPresetCopy(presetIndex: number): Product {
  const preset = PRODUCT_PRESETS[presetIndex];
  if (!preset) throw new Error(`Invalid preset index: ${presetIndex}`);
  return {
    ...preset,
    id: uuidv4(),
    dimensions: { ...preset.dimensions },
  };
}
