require("dotenv").config();

console.log("GROQ_API_KEY:", process.env.GROQ_API_KEY ? "Loaded ✅" : "Missing ❌");
console.log("__dirname:", __dirname);

const http = require("http");
const path = require("path");
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");
const authRoutes = require("./routes/auth");
const groupRoutes = require("./routes/groups");
const expenseRoutes = require("./routes/expenses");
const balanceRoutes = require("./routes/balances");
const analyticsRoutes = require("./routes/analytics");
const profileRoutes = require("./routes/profile");
const registerSockets = require("./sockets");
const connectDb = require("./utils/db");

const app = express();
const server = http.createServer(app);
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
let databaseStatus = "connecting";
const io = new Server(server, {
  cors: { origin: clientOrigin, credentials: true },
});

registerSockets(io);

app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(express.json());
app.use((req, _res, next) => {
  req.io = io;
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "splitstream-api",
    database: databaseStatus,
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api", expenseRoutes);
app.use("/api", balanceRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/profile", profileRoutes);

const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  return res.sendFile(path.join(distPath, "index.html"));
});

app.use((req, res) => {
  res.status(404).json({ message: `No route for ${req.method} ${req.path}` });
});

app.use((error, _req, res, _next) => {
  const status = error.statusCode || 500;
  res.status(status).json({ message: error.message || "Something went wrong." });
});

const port = process.env.PORT || 4000;
connectDb()
  .then((connection) => {
    databaseStatus = connection ? "connected" : "unavailable";

    if (!connection) {
      console.warn("SplitStream API listening without MongoDB. API routes that require persistence will fail until a database is available.");
    }

    server.listen(port, () => {
      console.log(`SplitStream API listening on ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB", error);
    process.exit(1);
  });
