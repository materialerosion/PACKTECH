/**
 * Label artwork for render tests.
 */

import { LabelArtwork } from '@/types';
import { INCH } from '@/services/drawingProfile';

/**
 * ONE A DAY Men's Multi 100 tablets, Bayer item 91049079 (CCL, job 403991510 r2).
 * 7.125" x 2.5" wrap with .125" corner radii; the brand panel is the left 28%.
 */
export const ONE_A_DAY_MENS_100CT: LabelArtwork = {
  source: 'Artwork 91049079 ONE-A-DAY Mens Complete Tablet 100 Each Label r2',
  imageUrl: '/artwork/one-a-day-mens-100ct-label.png',
  width: 7.125 * INCH,
  height: 2.5 * INCH,
  frontCenter: 0.14,
  finish: 'gloss',
};

/** Label fractions of the ONE A DAY artwork's three panels, for turning each to camera. */
export const ONE_A_DAY_PANELS = {
  brand: 0.14,
  supplementFacts: 0.46,
  ingredients: 0.78,
} as const;
