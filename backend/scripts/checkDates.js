import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const cards = await prisma.card.findMany({
    select: { id: true, project: true, createdAt: true, jiraKey: true },
    orderBy: { createdAt: 'desc' },
    take: 30
  });

  console.log('--- Recent cards by date ---');
  cards.forEach(c => {
    console.log(c.project.padEnd(12) + ' | ' + c.createdAt.toISOString().substring(0,10) + ' | ' + (c.jiraKey || '-'));
  });

  // Count today's date
  const today = new Date();
  today.setHours(0,0,0,0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayCount = await prisma.card.count({
    where: {
      createdAt: { gte: today, lt: tomorrow }
    }
  });

  const totalCount = await prisma.card.count();

  console.log('\n--- Stats ---');
  console.log('Total cards: ' + totalCount);
  console.log('Cards with today date: ' + todayCount);

  // Group by date
  const byDate = {};
  const allCards = await prisma.card.findMany({ select: { createdAt: true } });
  allCards.forEach(c => {
    const d = c.createdAt.toISOString().substring(0,10);
    byDate[d] = (byDate[d] || 0) + 1;
  });

  console.log('\n--- Cards by date ---');
  Object.entries(byDate)
    .sort((a,b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([date, count]) => {
      console.log(date + ': ' + count + ' cards');
    });

  await prisma.$disconnect();
}

main().catch(console.error);
