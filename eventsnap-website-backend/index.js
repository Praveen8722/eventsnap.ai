import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import contactRoutes from "./src/routes/contactRoutes.js";
import userSyncRoutes from "./src/routes/userSyncRoutes.js";

dotenv.config();

const app = express();

// ✅ CORS middleware — the EventSnap.ai marketing site (Vite dev server)
app.use(
  cors({
    // Company website: Vite dev server, plus the GitHub Pages build (pages-cd.yaml).
    origin: ["http://localhost:5173", "https://praveen8722.github.io"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

app.use(express.json()); // parse JSON

// routes
app.use("/api/contact", contactRoutes);
// Receives non-sensitive profile syncs from the EventSnap backend after a
// signup/login there — this app never authenticates anyone itself.
app.use("/api/users", userSyncRoutes);

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log("MongoDB Connected");
    app.listen(process.env.PORT, () =>
      console.log(`Server running on ${process.env.PORT}`)
    );
  })
  .catch(console.error);
