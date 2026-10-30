// Tripp's dogs, screen prints traced from his photos by
// scripts/meadow/pretzel.mjs and stella.mjs, standing beside him in the
// meadow, where they link to puppe.rs. Like his figures, each ink is
// multiplied by the light.

import { PRETZEL_ART } from './pretzel-art'
import { PRETZEL_SPOT, STELLA_SPOT } from './scene'
import { STELLA_ART } from './stella-art'

// Each dog's traced inks, which stand between the near paws at (footX, footY)
// in its photo's pixels; where it stands in the meadow; the top of its
// shoulders in the photo, to stand it at the right height beside him; how
// high that is beside his eyes; the angle of the line through its paws in the
// photo, for its shadow; and whether it's turned round to face him, since
// both photos face right
export const DOGS = [
  // Pretzel, his Australian shepherd: about 17 inches at the withers, a bit
  // over a quarter of the way up to them, side on, and at his left hand
  { art: PRETZEL_ART, at: PRETZEL_SPOT, withersY: 290, withers: 0.27, stance: 0, flip: true },
  // Stella, his border collie, a little taller, turned toward the camera,
  // and behind Pretzel
  { art: STELLA_ART, at: STELLA_SPOT, withersY: 705, withers: 0.29, stance: 0.36, flip: true },
]
