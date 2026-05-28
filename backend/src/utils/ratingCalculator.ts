import { prisma } from '../config/prisma';

/**
 * Recalculates a fixer's average rating using per-reviewer normalization.
 *
 * Algorithm:
 * 1. Get all non-hidden reviews for the fixer
 * 2. Group by reviewer
 * 3. Calculate each reviewer's average rating
 * 4. Final rating = average of all reviewers' averages
 *
 * This ensures each reviewer has equal influence regardless of
 * how many times they reviewed the same fixer.
 */
export async function recalculateFixerRating(fixerId: string): Promise<void> {
  const reviews = await prisma.review.findMany({
    where: { reviewee_id: fixerId, is_hidden: false },
    select: { reviewer_id: true, rating: true },
  });

  if (reviews.length === 0) {
    await prisma.user.update({
      where: { id: fixerId },
      data: { average_rating_as_fixer: 0 },
    });
    return;
  }

  // Group ratings by reviewer
  const byReviewer = new Map<string, number[]>();
  for (const review of reviews) {
    const ratings = byReviewer.get(review.reviewer_id) ?? [];
    ratings.push(review.rating);
    byReviewer.set(review.reviewer_id, ratings);
  }

  // Average per reviewer, then average of averages
  let sum = 0;
  for (const ratings of byReviewer.values()) {
    const reviewerAvg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    sum += reviewerAvg;
  }
  const weightedAverage = sum / byReviewer.size;

  await prisma.user.update({
    where: { id: fixerId },
    data: { average_rating_as_fixer: weightedAverage },
  });
}
