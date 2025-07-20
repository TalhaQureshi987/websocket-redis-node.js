const express = require("express");
const dotenv = require("dotenv");
const { sequelize } = require("./config/db.js");
const router = require("./routes/route.js");
const http = require("http");
const { subscriber } = require("./config/redisClient");
const { Server } = require("socket.io");

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust as needed for production
  },
});

// Socket.IO connection handler
io.on("connection", (socket) => {
  console.log("A client connected:", socket.id);

  // Real-time chat event handler
  socket.on("chat message", (msgObj) => {
    // msgObj: { username, text }
    io.emit("chat message", msgObj); // Broadcast to all clients
    console.log("Chat message:", msgObj);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Subscribe to Redis pub/sub channel and emit to clients
subscriber.subscribe("user_notifications", (message) => {
  io.emit("notification", message);
});

// Middleware
app.use(express.json());

// Routes
app.use("/api", router);

// Connect to Database and Sync Models
sequelize
  .authenticate()
  .then(() => {
    console.log("✅ Database connected successfully");
    return sequelize.sync(); // Sync all defined models to the DB
  })
  .then(() => {
    server.listen(port, () => {
      console.log(`🚀 Server is running on port ${port}`);
      console.log(`🚦 Socket.IO running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("❌ Unable to connect to the database:", err);
  });
