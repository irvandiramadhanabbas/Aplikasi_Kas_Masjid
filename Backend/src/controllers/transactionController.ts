import { Request, Response } from "express";
import { db } from "../db";

// Hitung saldo saat ini
async function getCurrentBalance(excludeId?: number): Promise<number> {
  let sql = `
    SELECT COALESCE(SUM(
      CASE WHEN jenis = 'PEMASUKAN' THEN nominal
           WHEN jenis = 'PENGELUARAN' THEN -nominal
           ELSE 0 END
    ), 0) AS saldo
    FROM transaksi
  `;

  const params: any[] = [];

  if (excludeId) {
    sql += " WHERE id <> ?";
    params.push(excludeId);
  }

  const [rows]: any = await db.query(sql, params);
  return Number(rows[0].saldo) || 0;
}

// ============================================
// GET /transactions (filter riwayat)
// ============================================
export async function getTransactions(req: Request, res: Response) {
  const { startDate, endDate, jenis, kategoriId } = req.query;

  const conditions: string[] = [];
  const params: any[] = [];

  if (startDate) {
    conditions.push("t.tglTransaksi >= ?");
    params.push(startDate);
  }

  if (endDate) {
    conditions.push("t.tglTransaksi <= ?");
    params.push(endDate);
  }

  if (jenis === "PEMASUKAN" || jenis === "PENGELUARAN") {
    conditions.push("t.jenis = ?");
    params.push(jenis);
  }

  if (kategoriId) {
    conditions.push("t.kategori_id = ?");
    params.push(Number(kategoriId));
  }

  let sql = `
    SELECT
      t.id,
      t.tglTransaksi,
      t.jenis,
      t.nominal,
      t.keterangan,
      t.tglPencatatan,
      t.kategori_id,
      k.nama AS kategori_nama,
      t.pengguna_id,
      u.username AS dicatat_oleh
    FROM transaksi t
    JOIN kategori k ON t.kategori_id = k.id
    JOIN pengguna u ON t.pengguna_id = u.id
  `;

  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }

  sql += " ORDER BY t.tglTransaksi DESC, t.id DESC";

  try {
    const [rows]: any = await db.query(sql, params);
    return res.json(rows);
  } catch (err) {
    console.error("getTransactions error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// ============================================
// POST /transactions
// ============================================
export async function tambahTransaction(req: Request, res: Response) {
  let { tglTransaksi, jenis, kategoriId, keterangan, nominal } = req.body;

  if (!tglTransaksi || !jenis || !kategoriId || nominal == null) {
    return res.status(400).json({ message: "Data transaksi tidak lengkap" });
  }

  // normalisasi & validasi jenis
  jenis = String(jenis).toUpperCase();
  if (jenis !== "PEMASUKAN" && jenis !== "PENGELUARAN") {
    return res.status(400).json({
      message: "Jenis transaksi harus 'PEMASUKAN' atau 'PENGELUARAN'",
    });
  }

  try {
    // cek kategori
    const [catRows]: any = await db.query(
      "SELECT id FROM kategori WHERE id = ?",
      [kategoriId]
    );
    if (catRows.length === 0) {
      return res.status(400).json({ message: "Kategori tidak ditemukan" });
    }

    // cek saldo jika pengeluaran
    if (jenis === "PENGELUARAN") {
      const saldo = await getCurrentBalance();
      if (nominal > saldo) {
        return res.status(400).json({
          message: "Saldo tidak mencukupi",
          saldoSekarang: saldo,
        });
      }
    }

    const userId = (req as any).user.id; // dari middleware auth

    const [result]: any = await db.query(
      `
      INSERT INTO transaksi
        (tglTransaksi, jenis, nominal, keterangan, kategori_id, pengguna_id, tglPencatatan)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
      `,
      [tglTransaksi, jenis, nominal, keterangan || null, kategoriId, userId]
    );

    return res.status(201).json({
      id: result.insertId,
      tglTransaksi,
      jenis,
      nominal,
      keterangan: keterangan || null,
      kategori_id: kategoriId,
      pengguna_id: userId,
    });
  } catch (err) {
    console.error("createTransaction error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// ============================================
// PUT /transactions/:id
// ============================================
export async function updateTransaction(req: Request, res: Response) {
  const id = Number(req.params.id);
  let { tglTransaksi, jenis, kategoriId, keterangan, nominal } = req.body;

  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ message: "ID tidak valid" });
  }

  if (!tglTransaksi || !jenis || !kategoriId || nominal == null) {
    return res.status(400).json({ message: "Data transaksi tidak lengkap" });
  }

  // normalisasi & validasi jenis
  jenis = String(jenis).toUpperCase();
  if (jenis !== "PEMASUKAN" && jenis !== "PENGELUARAN") {
    return res.status(400).json({
      message: "Jenis transaksi harus 'PEMASUKAN' atau 'PENGELUARAN'",
    });
  }

  try {
    const [trxRows]: any = await db.query(
      "SELECT * FROM transaksi WHERE id = ?",
      [id]
    );

    if (trxRows.length === 0) {
      return res.status(404).json({ message: "Transaksi tidak ditemukan" });
    }

    const [catRows]: any = await db.query(
      "SELECT id FROM kategori WHERE id = ?",
      [kategoriId]
    );
    if (catRows.length === 0) {
      return res.status(400).json({ message: "Kategori tidak ditemukan" });
    }

    // hitung saldo tanpa transaksi ini
    const saldoTanpaIni = await getCurrentBalance(id);
    const efekBaru = jenis === "PEMASUKAN" ? nominal : -nominal;

    if (saldoTanpaIni + efekBaru < 0) {
      return res.status(400).json({
        message: "Saldo akan negatif. Tidak boleh.",
      });
    }

    await db.query(
      `
      UPDATE transaksi
      SET tglTransaksi = ?, jenis = ?, nominal = ?, keterangan = ?, kategori_id = ?
      WHERE id = ?
      `,
      [tglTransaksi, jenis, nominal, keterangan || null, kategoriId, id]
    );

    return res.json({
      id,
      tglTransaksi,
      jenis,
      nominal,
      keterangan: keterangan || null,
      kategori_id: kategoriId,
    });
  } catch (err) {
    console.error("updateTransaction error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// ============================================
// DELETE /transactions/:id
// ============================================
/* export async function hapusTransaction(req: Request, res: Response) {
  const id = Number(req.params.id);

  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ message: "ID tidak valid" });
  }

  try {
    const [trxRows]: any = await db.query(
      "SELECT * FROM transaksi WHERE id = ?",
      [id]
    );

    if (trxRows.length === 0) {
      return res.status(404).json({ message: "Transaksi tidak ditemukan" });
    }

    // saldo setelah hapus = saldo tanpa transaksi ini
    const saldoSetelahHapus = await getCurrentBalance(id);

    if (saldoSetelahHapus < 0) {
      return res.status(400).json({
        message: "Saldo tidak boleh negatif",
      });
    }

    await db.query("DELETE FROM transaksi WHERE id = ?", [id]);

    return res.json({ message: "Transaksi berhasil dihapus" });
  } catch (err) {
    console.error("deleteTransaction error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}*/
