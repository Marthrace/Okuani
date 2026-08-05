import React from 'react';
import { Star, StarHalf } from 'lucide-react';

// Two modes: read-only display of an (optionally fractional) average rating,
// or an interactive 1-5 picker used by the "leave a review" form.
export default function RatingStars({ rating = 0, size = 14, interactive = false, value = 0, onChange }) {
  if (interactive) {
    return (
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className="star-rating-btn"
            onClick={() => onChange?.(n)}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
          >
            <Star size={size} fill={n <= value ? 'var(--accent)' : 'none'} color="var(--accent)" />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map((n) => {
        if (rating >= n) return <Star key={n} size={size} fill="var(--accent)" color="var(--accent)" />;
        if (rating >= n - 0.5) return <StarHalf key={n} size={size} fill="var(--accent)" color="var(--accent)" />;
        return <Star key={n} size={size} fill="none" color="var(--accent)" />;
      })}
    </div>
  );
}
