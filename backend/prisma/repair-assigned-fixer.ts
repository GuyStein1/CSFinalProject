/**
 * One-off repair: earlier versions of seed.ts created IN_PROGRESS and
 * COMPLETED tasks with an ACCEPTED bid but without setting the task's
 * assigned_fixer_id column. That broke review submission ("Task has no
 * assigned fixer"). This script scans for such tasks and patches them
 * using their ACCEPTED bid's fixer_id.
 *
 * Run: npx ts-node prisma/repair-assigned-fixer.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const broken = await prisma.task.findMany({
    where: {
      status: { in: ['IN_PROGRESS', 'COMPLETED'] },
      assigned_fixer_id: null,
    },
    include: {
      bids: {
        where: { status: 'ACCEPTED' },
        select: { fixer_id: true },
      },
    },
  });

  console.log(`Found ${broken.length} tasks with missing assigned_fixer_id.`);

  let fixed = 0;
  let skipped = 0;

  for (const task of broken) {
    const acceptedBid = task.bids[0];
    if (!acceptedBid) {
      console.warn(`  ⚠ Task ${task.id} has no ACCEPTED bid — skipping.`);
      skipped++;
      continue;
    }
    await prisma.task.update({
      where: { id: task.id },
      data: { assigned_fixer_id: acceptedBid.fixer_id },
    });
    fixed++;
  }

  console.log(`✓ Repaired ${fixed} tasks; ${skipped} skipped (no ACCEPTED bid).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
