import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const counts = await prisma.card.groupBy({
  by: ['project'],
  _count: { id: true }
});

console.log('Cards par projet:');
let total = 0;
for (const c of counts) {
  console.log(`  ${c.project}: ${c._count.id}`);
  total += c._count.id;
}
console.log(`\nTotal: ${total} cartes`);

await prisma.$disconnect();
