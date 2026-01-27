import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import communityRoutes from "./routes/communityRoutes.js";
import vaultRoutes from "./routes/vaultRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import analyzerRoutes from "./routes/analyzerRoutes.js";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";
import threatRoutes from "./routes/threatRoutes.js";

dotenv.config();
connectDB();

const app = express();
const httpServer = createServer(app);

/* SOCKET.IO */
export const io = new Server(httpServer, {
  cors: {
    origin: "*", // later restrict
  },
});

/*
io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);
  });
});
*/

/* MIDDLEWARE */
app.use(express.json());
app.use(cors());

/* THREAT DETECTION ROUTE */
app.use("/api/threat", threatRoutes);

/* ROUTES */
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/vault", vaultRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/analyzer", analyzerRoutes);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
