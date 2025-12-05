import { Router } from "express";
import {
  tampilkanPengguna,
  tambahPengguna,
  updatePengguna,
  // updateUserStatus,
  updatepasswordPengguna,
  hapusPengguna,
} from "../controllers/userController";

const router = Router();

router.get("/", tampilkanPengguna);
router.post("/", tambahPengguna);
router.put("/:id", updatePengguna);
//router.patch("/:id/status", updateUserStatus);
router.patch("/:id/reset-password", updatepasswordPengguna);
router.delete("/:id", hapusPengguna);

export default router;
