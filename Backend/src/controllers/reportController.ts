import { Request, Response } from "express";
import { db } from "../db";

export async function getReport(req: Request, res: Response) {
  const { startDate, endDate } = req.query as {
    startDate?: string;
    endDate?: string;
  };

  if (!startDate || !endDate) {
    return res.status(400).json({
      message: "startDate dan endDate wajib diisi (format YYYY-MM-DD)",
    });
  }

  // (opsional) cek urutan tanggal
  if (startDate > endDate) {
    return res.status(400).json({
      message: "startDate tidak boleh lebih besar dari endDate",
    });
  }

  try {
    // ========== 1. Ringkasan pemasukan & pengeluaran di periode ==========
    const [summaryRows]: any = await db.query(
      `
      SELECT
        COALESCE(SUM(CASE WHEN UPPER(jenis) = 'PEMASUKAN' THEN nominal ELSE 0 END), 0) AS totalPemasukan,
        COALESCE(SUM(CASE WHEN UPPER(jenis) = 'PENGELUARAN' THEN nominal ELSE 0 END), 0) AS totalPengeluaran
      FROM transaksi
      WHERE tglTransaksi >= ? AND tglTransaksi <= ?
      `,
      [startDate, endDate]
    );

    const totalPemasukan = Number(summaryRows[0].totalPemasukan) || 0;
    const totalPengeluaran = Number(summaryRows[0].totalPengeluaran) || 0;
    const saldoPeriode = totalPemasukan - totalPengeluaran;

    // ========== 2. Daftar transaksi di periode ==========
    const [trxRows]: any = await db.query(
      `
      SELECT
        t.id,
        t.tglTransaksi,
        t.jenis,
        t.nominal,
        t.keterangan,
        t.kategori_id,
        k.nama AS kategori_nama,
        t.pengguna_id,
        u.username AS dicatat_oleh
      FROM transaksi t
      JOIN kategori k ON t.kategori_id = k.id
      JOIN pengguna u ON t.pengguna_id = u.id
      WHERE t.tglTransaksi >= ? AND t.tglTransaksi <= ?
      ORDER BY t.tglTransaksi ASC, t.id ASC
      `,
      [startDate, endDate]
    );

    return res.json({
      startDate,
      endDate,
      totalPemasukan,
      totalPengeluaran,
      saldoPeriode,
      transaksi: trxRows,
    });
  } catch (err) {
    console.error("getReport error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
