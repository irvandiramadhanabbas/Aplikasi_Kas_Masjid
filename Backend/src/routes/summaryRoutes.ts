import { Router } from "express";
import { tampilkanRingkasan } from "../controllers/summaryController";

const router = Router();

// GET /summary  → ringkasan kas total
router.get("/", tampilkanRingkasan);

export default router;
