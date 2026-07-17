const connectDb = require("./db");

test("connectDb retries before succeeding", async () => {
  let attempts = 0;
  const fakeMongoose = {
    connection: { readyState: 0 },
    set() {},
    async connect() {
      attempts += 1;
      if (attempts < 2) {
        throw new Error("temporary failure");
      }
      return "ok";
    },
  };

  const connection = await connectDb({
    mongooseInstance: fakeMongoose,
    uri: "mongodb://127.0.0.1:27017/splitstream",
    retries: 3,
    delayMs: 0,
  });

  expect(attempts).toBe(2);
  expect(connection).toBe(fakeMongoose.connection);
});
