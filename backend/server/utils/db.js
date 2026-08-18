const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function connectDb() {
  try {
    await prisma.$connect();
    console.log("PostgreSQL (Prisma) connected ✅");
    return prisma;
  } catch (error) {
    console.warn("PostgreSQL unavailable via Prisma:", error.message);
    return null;
  }
}

module.exports = { prisma, connectDb };
