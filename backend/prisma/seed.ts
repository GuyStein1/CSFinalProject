import { PrismaClient, Category, TaskStatus, BidStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Placeholder users — replace firebase_uid with real UIDs in Phase 2
const users = [
  {
    firebase_uid: 'PLACEHOLDER_1',
    full_name: 'Avi Cohen',
    email: 'avi@example.com',
    phone_number: '0501111111',
    specializations: [] as Category[],
  },
  {
    firebase_uid: 'PLACEHOLDER_2',
    full_name: 'Dana Levi',
    email: 'dana@example.com',
    phone_number: '0502222222',
    specializations: [] as Category[],
  },
  {
    firebase_uid: 'PLACEHOLDER_3',
    full_name: 'Yossi Mizrahi',
    email: 'yossi@example.com',
    phone_number: '0503333333',
    specializations: [] as Category[],
  },
  {
    firebase_uid: 'PLACEHOLDER_4',
    full_name: 'Noa Peretz',
    email: 'noa@example.com',
    phone_number: '0504444444',
    specializations: [Category.ELECTRICITY, Category.PLUMBING],
  },
  {
    firebase_uid: 'PLACEHOLDER_5',
    full_name: 'Rami Ben-David',
    email: 'rami@example.com',
    phone_number: '0505555555',
    specializations: [Category.CARPENTRY, Category.PAINTING],
  },
  {
    firebase_uid: 'PLACEHOLDER_6',
    full_name: 'Shira Katz',
    email: 'shira@example.com',
    phone_number: '0506666666',
    specializations: [Category.MOVING, Category.GENERAL],
  },
];

async function main() {
  console.log('Seeding users...');
  for (const user of users) {
    await prisma.user.upsert({
      where: { firebase_uid: user.firebase_uid },
      update: {},
      create: user,
    });
  }

  // Tasks and bids will be seeded in Phase 2 once real Firebase UIDs are available
  console.log('Seed complete');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
