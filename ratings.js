// ================================
// RATING + TOP BUSINESSES SYSTEM
// ================================

async function getBusinessRating(businessId) {
  if (!supabaseClient) return { rating: 0, count: 0 };

  const { data, error } = await supabaseClient
    .from('reviews')
    .select('rating')
    .eq('business_id', businessId);

  if (error || !data) return { rating: 0, count: 0 };

  const count = data.length;
  const avg = count
    ? (data.reduce((a, b) => a + b.rating, 0) / count).toFixed(1)
    : 0;

  return { rating: avg, count };
}

function renderStars(rating) {
  const full = Math.round(rating);
  return '⭐'.repeat(full);
}

// Insert rating into business cards
async function injectRatings() {
  if (!loadedBusinesses) return;

  for (const b of loadedBusinesses) {
    const rating = await getBusinessRating(b.id);

    const el = document.querySelector(`[data-business-id="${b.id}"] .rating-box`);
    if (el) {
      if (rating.count === 0) {
        el.innerHTML = "Новый бизнес";
      } else {
        el.innerHTML = `${renderStars(rating.rating)} ${rating.rating} (${rating.count})`;
      }
    }
  }
}

// Sort businesses by rating
async function sortBusinessesByRating() {
  if (!loadedBusinesses) return;

  const ratings = {};

  for (const b of loadedBusinesses) {
    const r = await getBusinessRating(b.id);
    ratings[b.id] = r.rating;
  }

  loadedBusinesses.sort((a, b) => (ratings[b.id] || 0) - (ratings[a.id] || 0));

  if (typeof renderBusinesses === "function") {
    renderBusinesses();
  }
}

// Auto refresh reviews realtime
function subscribeReviewsRealtime() {
  if (!supabaseClient) return;

  supabaseClient
    .channel('reviews-live')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'reviews' },
      payload => {
        console.log('New review:', payload);
        injectRatings();
      }
    )
    .subscribe();
}

// Run after page load
setTimeout(() => {
  injectRatings();
  subscribeReviewsRealtime();
}, 1500);

