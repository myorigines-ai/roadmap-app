import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

console.log('Suppression des cartes Dev et Support...');

const deleted = await prisma.card.deleteMany({
  where: {
    project: { in: ['Dev', 'Support'] }
  }
});

console.log(`${deleted.count} cartes supprimees`);

const counts = await prisma.card.groupBy({
  by: ['project'],
  _count: { id: true }
});

console.log('\nCartes restantes:');
for (const c of counts) {
  console.log(`  ${c.project}: ${c._count.id}`);
}

await prisma.$disconnect();
