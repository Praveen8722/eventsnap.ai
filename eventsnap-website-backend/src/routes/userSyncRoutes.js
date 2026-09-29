import express from "express";
import { syncUser, getSyncedUser } from "../controllers/userSyncController.js";
import { requireApiKey } from "../middleware/requireApiKey.js";

const router = express.Router();
// Server-to-server only (EventSnap dashboard backend) — never public, or
// anyone could read/overwrite any photographer's profile by id.
router.post("/sync", requireApiKey, syncUser);
router.get("/sync/:eventSnapUserId", requireApiKey, getSyncedUser);

export default router;
