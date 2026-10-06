import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./src/routes/authRoutes.js";
import bookingRoutes from "./src/routes/bookingRoutes.js";
import eventRoutes from "./src/routes/eventRoutes.js";
import galleryRoutes from "./src/routes/galleryRoutes.js";
import invoiceRoutes from "./src/routes/invoiceRoutes.js";
import inquiryRoutes from "./src/routes/inquiryRoutes.js";
import portfolioRoutes from "./src/routes/portfolioRoutes.js";
import createEventRoutes from "./src/routes/createEventRoutes.js";
import { verifyEmailTransport } from "./src/services/emailservice.js";
import { migrateLegacyPhotos } from "./src/services/accountPhotoStorage.js";
import { migrateLegacyPortfolioPhotos } from "./src/services/portfolioPhotoStorage.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Local dashboard UI, plus the GitHub Pages build (pages-cd.yaml).
const ALLOWED_ORIGINS = ["http://localhost:3000", "https://praveen8722.github.io"];

// Chrome/Edge "Private Network Access": when a public site (GitHub Pages)
// calls this API on localhost, the preflight asks for permission with
// Access-Control-Request-Private-Network — grant it for allowed origins only.
app.use((req, res, next) => {
  if (
    req.headers["access-control-request-private-network"] === "true" &&
    ALLOWED_ORIGINS.includes(req.headers.origin)
  ) {
    res.setHeader("Access-Control-Allow-Private-Network", "true");
  }
  next();
});

// ✅ CORS middleware
app.use(
  cors({
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

app.use(express.json()); // parse JSON

// Uploaded gallery/portfolio photos (see middleware/uploadGallery.js and
// uploadPortfolio.js) are served statically from here.
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// routes
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/galleries", galleryRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/inquiries", inquiryRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/create-events", createEventRoutes);

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log("MongoDB Connected");
    app.listen(process.env.PORT, () =>
      console.log(`Server running on ${process.env.PORT}`)
    );
    // Logs whether Portfolio inquiry emails can actually be sent.
    verifyEmailTransport();
    // Moves profile/business and portfolio photos still on disk into MongoDB.
    migrateLegacyPhotos().catch((error) =>
      console.error("Account photo migration failed:", error.message)
    );
    migrateLegacyPortfolioPhotos().catch((error) =>
      console.error("Portfolio photo migration failed:", error.message)
    );
  })
  .catch(console.error);
