import { Router } from "express";
import {
  getKategori,
  tambahKategori,
  updateKategori,
  hapusKategori,
} from "../controllers/categoryController";
import { authMiddleware, requireRole } from "../middlewares/authMiddleware";

const router = Router();

// semua yang akses kategori harus login dulu
router.use(authMiddleware);

// semua yang login boleh lihat daftar kategori
router.get("/", requireRole("KETUA", "BENDAHARA", "JAMAAH"), getKategori);

// hanya BENDAHARA yang boleh kelola
router.post("/", requireRole("BENDAHARA"), tambahKategori);
router.put("/:id", requireRole("BENDAHARA"), updateKategori);
router.delete("/:id", requireRole("BENDAHARA"), hapusKategori);

export default router;
