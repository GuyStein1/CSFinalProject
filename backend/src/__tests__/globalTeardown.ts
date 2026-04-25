import { prisma } from '../config/prisma';

export default async function globalTeardown() {
  await prisma.$disconnect();
}
