import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import categoryRoutes from "./routes/categoryRoutes";
import transactionRoutes from "./routes/transactionRoutes";
import summaryRoutes from "./routes/summaryRoutes";
import reportRoutes from "./routes/reportRoutes";
import { authMiddleware, requireRole } from "./middlewares/authMiddleware";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// public routes
app.use("/auth", authRoutes);

// protected routes - khusus KETUA
app.use("/users", authMiddleware, requireRole("KETUA"), userRoutes);

// kategori:
// - semua user yang login boleh GET (lihat daftar kategori)
// - hanya BENDAHARA (dan KETUA kalau mau) boleh tambah/edit/nonaktif
app.use("/categories", authMiddleware, categoryRoutes);

// transaksi:
// - semua user yang login boleh GET (lihat daftar transaksi)
// - hanya BENDAHARA (dan KETUA kalau mau) boleh tambah/edit/hapus
app.use("/transactions", authMiddleware, transactionRoutes);

// summary kas – semua user yang login boleh lihat
app.use("/summary", authMiddleware, summaryRoutes);

// laporan periode – semua user yang login boleh lihat
app.use("/reports", authMiddleware, requireRole("BENDAHARA") , reportRoutes);

export default app;
