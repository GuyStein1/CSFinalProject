/**
 * Adds completed tasks from March 2026 for Zilber (requester) with Shick (fixer).
 * Run: npx ts-node prisma/seed-march-completed.ts
 */
import { PrismaClient, Category, BidStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  // Look up Zilber (requester) and Shick (fixer)
  const zilber = await prisma.user.findFirst({ where: { email: 'zilber@example.com' } });
  const shick = await prisma.user.findFirst({ where: { email: 'shick@example.com' } });

  if (!zilber || !shick) {
    console.error('Could not find zilber or shick users. Run the main seed first.');
    process.exit(1);
  }

  const marchTasks = [
    {
      title: 'תיקון נזילה במטבח',
      description: 'יש נזילה מתחת לכיור במטבח, צריך להחליף את הצינור.',
      category: Category.PLUMBING,
      suggested_price: 250,
      location: 'Haifa, Carmel Center',
      address: 'HaNassi 42, Haifa',
      lon: 34.9780, lat: 32.7850,
      completed_at: new Date('2026-03-05T14:00:00Z'),
      bid_price: 220,
    },
    {
      title: 'התקנת מנורות בסלון',
      description: 'צריך להתקין 3 מנורות תקרה בסלון ובחדר שינה.',
      category: Category.ELECTRICITY,
      suggested_price: 400,
      location: 'Haifa, Neve Shaanan',
      address: 'Herzl 18, Haifa',
      lon: 34.9870, lat: 32.7930,
      completed_at: new Date('2026-03-12T10:00:00Z'),
      bid_price: 380,
    },
    {
      title: 'צביעת חדר ילדים',
      description: 'צביעת חדר ילדים בשני צבעים, כולל הכנת הקירות.',
      category: Category.PAINTING,
      suggested_price: 600,
      location: 'Haifa, Ahuza',
      address: 'Moriah 55, Haifa',
      lon: 34.9720, lat: 32.7880,
      completed_at: new Date('2026-03-20T16:00:00Z'),
      bid_price: 550,
    },
    {
      title: 'הרכבת ארון בגדים',
      description: 'הרכבת ארון איקאה PAX גדול עם מגירות.',
      category: Category.ASSEMBLY,
      suggested_price: 350,
      location: 'Haifa, Bat Galim',
      address: 'HaAliya 10, Haifa',
      lon: 34.9590, lat: 32.8200,
      completed_at: new Date('2026-03-28T12:00:00Z'),
      bid_price: 300,
    },
  ];

  console.log(`Adding ${marchTasks.length} completed March tasks (Zilber → Shick)...`);

  for (const task of marchTasks) {
    const taskId = randomUUID();

    await prisma.$executeRaw`
      INSERT INTO "Task" (
        id, requester_id, title, description, media_urls, category,
        suggested_price, status, general_location_name, exact_address,
        coordinates, completed_at, assigned_fixer_id, created_at, updated_at
      ) VALUES (
        ${taskId}::uuid,
        ${zilber.id}::uuid,
        ${task.title},
        ${task.description},
        ARRAY[]::text[],
        ${task.category}::"Category",
        ${task.suggested_price},
        'COMPLETED'::"TaskStatus",
        ${task.location},
        ${task.address},
        ST_SetSRID(ST_MakePoint(${task.lon}::float8, ${task.lat}::float8), 4326),
        ${task.completed_at},
        ${shick.id}::uuid,
        ${new Date(task.completed_at.getTime() - 7 * 24 * 60 * 60 * 1000)},
        ${task.completed_at}
      )
    `;

    await prisma.bid.create({
      data: {
        task_id: taskId,
        fixer_id: shick.id,
        offered_price: task.bid_price,
        description: 'אני בעל מקצוע מנוסה, אשמח לעזור!',
        status: BidStatus.ACCEPTED,
      },
    });
  }

  console.log('✓ Done — 4 completed March tasks added');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
