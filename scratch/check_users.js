const { PrismaClient } = require("./packages/db/node_modules/@prisma/client");
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://neondb_owner:npg_B3Dd6WIxocRC@ep-divine-meadow-ammpnnfm-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true"
        }
    }
});

async function main() {
    try {
        const users = await prisma.user.findMany({
            take: 5,
            select: {
                username: true,
                role: true
            }
        });
        console.log("Registered Users:", JSON.stringify(users, null, 2));
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
