import { Request, Response } from "express";
import { db } from "../db";

// GET /kategori
export async function getKategori(req: Request, res: Response) {
  try {
    const [rows]: any = await db.query(`
      SELECT id, nama
      FROM kategori
      ORDER BY nama ASC
    `);

    return res.json(rows);
  } catch (err) {
    console.error("getKategori error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// POST /kategori
export async function createKategori(req: Request, res: Response) {
  const { nama } = req.body;

  if (!nama || nama.trim() === "") {
    return res.status(400).json({ message: "Nama kategori wajib diisi" });
  }

  try {
    // cek duplikasi
    const [exists]: any = await db.query(
      "SELECT id FROM kategori WHERE nama = ?",
      [nama.trim()]
    );

    if (exists.length > 0) {
      return res.status(400).json({ message: "Nama kategori sudah digunakan" });
    }

    const [result]: any = await db.query(
      "INSERT INTO kategori (nama) VALUES (?)",
      [nama.trim()]
    );

    return res.status(201).json({
      id: result.insertId,
      nama: nama.trim(),
    });
  } catch (err) {
    console.error("createKategori error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// PUT /kategori/:id
export async function updateKategori(req: Request, res: Response) {
  const id = Number(req.params.id);
  const { nama } = req.body;

  if (!id || isNaN(id)) {
    return res.status(400).json({ message: "ID tidak valid" });
  }

  if (!nama || nama.trim() === "") {
    return res.status(400).json({ message: "Nama kategori wajib diisi" });
  }

  try {
    const [existing]: any = await db.query(
      "SELECT id FROM kategori WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: "Kategori tidak ditemukan" });
    }

    // cek duplikasi selain dirinya
    const [dupe]: any = await db.query(
      "SELECT id FROM kategori WHERE nama = ? AND id <> ?",
      [nama.trim(), id]
    );

    if (dupe.length > 0) {
      return res.status(400).json({ message: "Nama kategori sudah digunakan" });
    }

    await db.query(
      "UPDATE kategori SET nama = ? WHERE id = ?",
      [nama.trim(), id]
    );

    return res.json({ id, nama: nama.trim() });
  } catch (err) {
    console.error("updateKategori error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// DELETE /kategori/:id
export async function deleteKategori(req: Request, res: Response) {
  const id = Number(req.params.id);

  if (!id || isNaN(id)) {
    return res.status(400).json({ message: "ID tidak valid" });
  }

  try {
    // cek apakah kategori dipakai di transaksi
    const [trx]: any = await db.query(
      "SELECT COUNT(*) AS total FROM transaksi WHERE kategori_id = ?",
      [id]
    );

    if (trx[0].total > 0) {
      return res.status(400).json({
        message: "Kategori tidak dapat dihapus karena masih digunakan",
      });
    }

    const [result]: any = await db.query(
      "DELETE FROM kategori WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Kategori tidak ditemukan" });
    }

    return res.json({ message: "Kategori berhasil dihapus" });
  } catch (err) {
    console.error("deleteKategori error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
