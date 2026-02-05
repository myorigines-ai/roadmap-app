import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const config = await prisma.jiraConfig.findFirst();
  if (config) {
    console.log('Email:', config.email);
    console.log('URL:', config.baseUrl);
    console.log('Token (premiers chars):', config.apiToken?.substring(0, 15) + '...');
  } else {
    console.log('Aucune config Jira trouvee');
  }
  await prisma.$disconnect();
}

main();
