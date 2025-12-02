import { Router } from "express";
import { getReport, } from "../controllers/reportController";
import { getReportPdf } from "../controllers/reportPdfController"; 
const router = Router();

// GET /reports?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get("/", getReport);

router.get("/pdf", getReportPdf);

export default router;
