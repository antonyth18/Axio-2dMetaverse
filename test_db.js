const { PrismaClient } = require('./packages/db/src/generated/prisma');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ include: { avatar: true } });
  console.log("Users:", users.map(u => ({ id: u.id, username: u.username, avatarId: u.avatarId, avatarName: u.avatar?.name })));
}
main().catch(console.error);
