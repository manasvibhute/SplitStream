const mongoose = require("mongoose");

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectDb(options = {}) {
  const {
    mongooseInstance = mongoose,
    uri = process.env.MONGODB_URI || "mongodb://localhost:27017/splitstream",
    retries = Number(process.env.MONGODB_CONNECT_RETRIES || 3),
    delayMs = Number(process.env.MONGODB_CONNECT_DELAY_MS || 1000),
    allowFallback = process.env.MONGODB_ALLOW_FALLBACK !== "false",
  } = options;

  mongooseInstance.set("strictQuery", true);

  if (mongooseInstance.connection.readyState === 1) {
    return mongooseInstance.connection;
  }

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await mongooseInstance.connect(uri, {
        serverSelectionTimeoutMS: 3000,
        socketTimeoutMS: 3000,
      });
      return mongooseInstance.connection;
    } catch (error) {
      if (attempt === retries || !allowFallback) {
        if (allowFallback) {
          console.warn(
            `MongoDB unavailable at ${uri}. Continuing without a database connection for local development.`,
            error.message,
          );
          return null;
        }

        throw error;
      }

      console.warn(`MongoDB connection attempt ${attempt} failed. Retrying...`, error.message);
      await wait(delayMs);
    }
  }

  return null;
}

module.exports = connectDb;
