import { Router } from "express";
import { getSummary } from "../controllers/summaryController"

const router = Router();

// GET /summary  → ringkasan kas total
router.get("/", getSummary);

export default router;
