import { prisma } from '../config/prisma';

/**
 * Recalculates a fixer's average rating using:
 *
 * 1. Per-reviewer normalization — each reviewer has equal influence
 *    regardless of how many times they reviewed the same fixer.
 *
 * 2. Exponential Time Decay — recent reviews weigh more than older ones.
 *    w_i = e^(-λ * Δt_i)   where λ = DECAY_LAMBDA, Δt = days since review.
 *    Half-life ≈ 180 days (6 months).
 *
 * 3. Bayesian Smoothing — pulls fixers with few reviews toward the
 *    platform-wide average, preventing a single 5-star review from
 *    outranking a veteran with 4.8 across 100 reviews.
 *    S = (v * R + m * C) / (v + m)
 *    where v = effective review count, R = weighted avg, m = confidence
 *    parameter, C = platform-wide average.
 */

// Half-life of ~180 days: λ = ln(2) / 180
const DECAY_LAMBDA = Math.LN2 / 180;

// Bayesian confidence parameter — number of "virtual" reviews pulling toward
// the platform average. With m=3, a fixer needs ~3 real reviews before their
// personal average starts to dominate.
const BAYESIAN_M = 3;

export async function recalculateFixerRating(fixerId: string): Promise<void> {
  const reviews = await prisma.review.findMany({
    where: { reviewee_id: fixerId, is_hidden: false },
    select: { reviewer_id: true, rating: true, created_at: true },
  });

  if (reviews.length === 0) {
    await prisma.user.update({
      where: { id: fixerId },
      data: { average_rating_as_fixer: 0 },
    });
    return;
  }

  const now = Date.now();

  // ── Step 1: Per-reviewer time-weighted averages ──────────────────────
  // Group by reviewer, compute weighted average per reviewer
  const byReviewer = new Map<string, { rating: number; created_at: Date }[]>();
  for (const review of reviews) {
    const list = byReviewer.get(review.reviewer_id) ?? [];
    list.push({ rating: review.rating, created_at: review.created_at });
    byReviewer.set(review.reviewer_id, list);
  }

  let reviewerWeightedSum = 0;
  let totalEffectiveCount = 0;

  for (const ratings of byReviewer.values()) {
    let weightedSum = 0;
    let weightSum = 0;

    for (const { rating, created_at } of ratings) {
      const daysSince = (now - created_at.getTime()) / (1000 * 60 * 60 * 24);
      const weight = Math.exp(-DECAY_LAMBDA * daysSince);
      weightedSum += rating * weight;
      weightSum += weight;
    }

    const reviewerAvg = weightSum > 0 ? weightedSum / weightSum : 0;
    reviewerWeightedSum += reviewerAvg;
    totalEffectiveCount += 1;
  }

  // R = time-decay-weighted, per-reviewer-normalized average
  const R = reviewerWeightedSum / totalEffectiveCount;
  const v = totalEffectiveCount; // effective number of unique reviewers

  // ── Step 2: Platform-wide average (C) ────────────────────────────────
  const platformResult = await prisma.review.aggregate({
    where: { is_hidden: false },
    _avg: { rating: true },
  });
  const C = platformResult._avg.rating ?? 3; // fallback to 3 if no reviews exist

  // ── Step 3: Bayesian Smoothing ───────────────────────────────────────
  // S = (v * R + m * C) / (v + m)
  const smoothedRating = (v * R + BAYESIAN_M * C) / (v + BAYESIAN_M);

  // Round to 2 decimal places
  const finalRating = Math.round(smoothedRating * 100) / 100;

  await prisma.user.update({
    where: { id: fixerId },
    data: { average_rating_as_fixer: finalRating },
  });
}
