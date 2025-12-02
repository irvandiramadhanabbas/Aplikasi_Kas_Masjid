import { Router } from "express";
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "../controllers/transactionController";
import { requireRole } from "../middlewares/authMiddleware";

const router = Router();

// semua yang login boleh lihat transaksi
router.get("/", getTransactions);

// hanya BENDAHARA yang boleh input/edit/hapus transaksi
router.post("/", requireRole("BENDAHARA"), createTransaction);
router.put("/:id", requireRole("BENDAHARA"), updateTransaction);
router.delete("/:id", requireRole("BENDAHARA"), deleteTransaction);

export default router;
