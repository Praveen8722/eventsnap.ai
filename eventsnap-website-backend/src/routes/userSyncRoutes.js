import express from "express";
import { syncUser, getSyncedUser } from "../controllers/userSyncController.js";

const router = express.Router();
router.post("/sync", syncUser);
router.get("/sync/:eventSnapUserId", getSyncedUser);

export default router;
