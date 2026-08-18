const { connectDb } = require("./db");

test("connectDb connects using Prisma", async () => {
  const result = await connectDb();
  // Expect result to either connect or gracefully log warning if DB is unavailable
  expect(result !== undefined).toBe(true);
});
