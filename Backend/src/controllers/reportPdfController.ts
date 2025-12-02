import { Request, Response } from "express";
import PDFDocument from "pdfkit";
import { db } from "../db";

export async function getReportPdf(req: Request, res: Response) {
  const { startDate, endDate } = req.query as {
    startDate?: string;
    endDate?: string;
  };

  if (!startDate || !endDate) {
    return res.status(400).json({
      message: "startDate dan endDate wajib diisi (format YYYY-MM-DD)",
    });
  }

  // opsional: cek urutan tanggal
  if (startDate > endDate) {
    return res.status(400).json({
      message: "startDate tidak boleh lebih besar dari endDate",
    });
  }

  try {
    // ========== 1. Ambil summary ==========
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

    // ========== 2. Ambil transaksi detail ==========
    const [trxRows]: any = await db.query(
      `
      SELECT
        t.id,
        t.tglTransaksi,
        t.jenis,
        t.nominal,
        t.keterangan,
        k.nama AS kategori_nama,
        u.username AS dicatat_oleh
      FROM transaksi t
      JOIN kategori k ON t.kategori_id = k.id
      JOIN pengguna u ON t.pengguna_id = u.id
      WHERE t.tglTransaksi >= ? AND t.tglTransaksi <= ?
      ORDER BY t.tglTransaksi ASC, t.id ASC
      `,
      [startDate, endDate]
    );

    // ========== 3. Buat PDF ==========
    const doc = new PDFDocument({ margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="laporan_kas_${startDate}_sd_${endDate}.pdf"`
    );

    doc.pipe(res);

    // Judul
    doc.fontSize(16).text("LAPORAN KAS MASJID", { align: "center" });
    doc.moveDown(0.5);
    doc
      .fontSize(12)
      .text(`Periode: ${startDate} s/d ${endDate}`, { align: "center" });
    doc.moveDown(1);

    // Ringkasan
    doc
      .fontSize(12)
      .text(
        `Total Pemasukan  : Rp ${totalPemasukan.toLocaleString("id-ID")}`
      );
    doc.text(
      `Total Pengeluaran: Rp ${totalPengeluaran.toLocaleString("id-ID")}`
    );
    doc.text(
      `Saldo Periode    : Rp ${saldoPeriode.toLocaleString("id-ID")}`
    );
    doc.moveDown(1);

    // Tabel transaksi
    doc.fontSize(12).text("Daftar Transaksi", { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(10);
    doc.text("Tanggal", { continued: true, width: 80 });
    doc.text("Jenis", { continued: true, width: 80 });
    doc.text("Kategori", { continued: true, width: 120 });
    doc.text("Nominal", { continued: true, width: 90 });
    doc.text("Dicatat Oleh", { continued: true, width: 80 });
    doc.text("Keterangan");
    doc.moveDown(0.3);
    doc.moveTo(40, doc.y).lineTo(570, doc.y).stroke();
    doc.moveDown(0.3);

    if (trxRows.length === 0) {
      doc.text("Tidak ada transaksi pada periode ini.");
    } else {
      trxRows.forEach((row: any) => {
        doc.text(row.tglTransaksi, { continued: true, width: 80 });
        doc.text(row.jenis, { continued: true, width: 80 });
        doc.text(row.kategori_nama, { continued: true, width: 120 });
        doc.text(
          `Rp ${Number(row.nominal).toLocaleString("id-ID")}`,
          { continued: true, width: 90 }
        );
        doc.text(row.dicatat_oleh, { continued: true, width: 80 });
        doc.text(row.keterangan || "-");
        doc.moveDown(0.2);
      });
    }

    doc.end();
  } catch (err) {
    console.error("getReportPdf error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
