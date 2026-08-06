import { normalizeCrop, titleCase } from './normalize';
import { quantityUnit, singularUnit } from './constants';

// Aggregates active (non-deleted) listings into per-crop, per-unit stock
// totals for the Market Dashboard's Stock Availability panel. Groups on the
// *normalized* crop key so "Tomatoes" / "tomatoes" / "TOMATOES" all
// contribute to one total rather than three — see normalizeCrop. Quantities
// are only ever summed within a matching unit (kg with kg, Bag with Bag);
// mixed units for the same crop show as separate rows rather than being
// added together into a meaningless number.
export function computeStockAnalysis(listings) {
  const groups = new Map();

  for (const listing of listings || []) {
    if (listing.deleted) continue;
    const cropKey = normalizeCrop(listing.crop);
    if (!cropKey) continue;
    const unit = singularUnit(listing.unit);
    const key = `${cropKey}|${unit}`;

    const existing = groups.get(key);
    const quantity = Number(listing.quantity) || 0;
    if (existing) {
      existing.totalQuantity += quantity;
      existing.listingCount += 1;
    } else {
      groups.set(key, {
        cropKey,
        // Prefer an actual seller-entered label over a synthesized one so
        // the display reads naturally (falls back to title-casing the
        // normalized key only if that's ever unavailable).
        displayCrop: listing.crop ? listing.crop.trim() : titleCase(cropKey),
        unit,
        totalQuantity: quantity,
        listingCount: 1,
      });
    }
  }

  return Array.from(groups.values())
    .map((g) => ({ ...g, unitLabel: quantityUnit(g.unit, g.totalQuantity) }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity);
}
