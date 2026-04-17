
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const spaces = await prisma.space.findMany({
    select: { id: true, name: true }
  });
  console.log("Existing Spaces:", JSON.stringify(spaces, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
