import { Request, Response } from "express";
import { db } from "../db";

export async function tampilkanRingkasan(req: Request, res: Response) {
  try {
    const [rows]: any = await db.query(`
      SELECT
        COALESCE(SUM(CASE WHEN UPPER(jenis) = 'PEMASUKAN' THEN nominal ELSE 0 END), 0) AS totalPemasukan,
        COALESCE(SUM(CASE WHEN UPPER(jenis) = 'PENGELUARAN' THEN nominal ELSE 0 END), 0) AS totalPengeluaran
      FROM transaksi
    `);

    const totalPemasukan = Number(rows[0].totalPemasukan) || 0;
    const totalPengeluaran = Number(rows[0].totalPengeluaran) || 0;
    const totalSaldo = totalPemasukan - totalPengeluaran;

    return res.json({
      totalPemasukan,
      totalPengeluaran,
      totalSaldo,
    });
  } catch (err) {
    console.error("tampilkanRingkasan error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
