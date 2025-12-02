import { Router } from "express";
import {
  getKategori,
  createKategori,
  updateKategori,
  deleteKategori,
} from "../controllers/categoryController";
import { authMiddleware ,requireRole } from "../middlewares/authMiddleware";

const router = Router();

// semua yang akses kategori harus login dulu
router.use(authMiddleware);

// semua yang login boleh lihat daftar kategori
router.get("/", requireRole("KETUA", "BENDAHARA", "JAMAAH"), getKategori);

// hanya BENDAHARA yang boleh kelola
router.post("/", requireRole("BENDAHARA"), createKategori);
router.put("/:id", requireRole("BENDAHARA"), updateKategori);
router.delete("/:id", requireRole("BENDAHARA"), deleteKategori);

export default router;
