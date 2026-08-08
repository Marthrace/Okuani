import { normalizeCrop } from './normalize';
import { singularUnit } from './constants';

// Tells a seller, at a glance, whether one of their own active listings
// could plausibly cover a buyer's request — matched on normalized crop +
// unit (so "Tomatoes"/"tomatoes"/"TOMATOES" all match, and quantities in
// incompatible units never get compared). Region/location are deliberately
// NOT part of the match test — per the spec, a seller should still see and
// judge requests outside an exact location match themselves, so those are
// just informational text on the card, not a filter.
//
// Returns null (no matching product at all) or:
//   { type: 'full',    listing } — matching listing's quantity covers the request
//   { type: 'partial', listing } — matching listing exists but falls short
export function matchRequestAgainstListings(request, myListings) {
  const requestCropKey = normalizeCrop(request.crop);
  const requestUnit = singularUnit(request.unit);

  const candidates = (myListings || []).filter(
    (l) => !l.deleted && normalizeCrop(l.crop) === requestCropKey && singularUnit(l.unit) === requestUnit
  );
  if (candidates.length === 0) return null;

  // Prefer whichever candidate listing has the most quantity — the most
  // useful one to show, regardless of whether it alone fully covers the ask.
  const best = candidates.reduce((max, l) => (Number(l.quantity) > Number(max.quantity) ? l : max), candidates[0]);

  return {
    type: Number(best.quantity) >= Number(request.quantity) ? 'full' : 'partial',
    listing: best,
  };
}
