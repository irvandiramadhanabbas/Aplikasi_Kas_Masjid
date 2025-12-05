import { Request, Response } from "express";
import { db } from "../db";
import bcrypt from "bcryptjs";

// Email regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Role yang diijinkan
const allowedRoles = ["KETUA", "BENDAHARA", "JAMAAH"] as const;

// ======================================================
// GET ALL USERS
// ======================================================
export async function tampilkanPengguna(req: Request, res: Response) {
  try {
    const [rows]: any = await db.query(
      `SELECT id, username, email, role, status 
       FROM pengguna
       ORDER BY id ASC`
    );
    return res.json(rows);
  } catch (err) {
    console.error("tampilkanPengguna error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// ======================================================
// CREATE USER
// ======================================================
export async function tambahPengguna(req: Request, res: Response) {
  let { username, email, password, role } = req.body as {
    username?: string;
    email?: string;
    password?: string;
    role?: string;
  };

  if (!username || !email || !password || !role) {
    return res.status(400).json({ message: "Data tidak lengkap" });
  }

  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Format email tidak valid" });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: "Password minimal 8 karakter" });
  }

  // Normalisasi role ke uppercase
  role = role.toUpperCase();
  if (!allowedRoles.includes(role as any)) {
    return res.status(400).json({ message: "Role tidak valid" });
  }

  try {
    // cek username unik
    const [u1]: any = await db.query(
      "SELECT id FROM pengguna WHERE username = ?",
      [username]
    );
    if (u1.length > 0) {
      return res.status(400).json({ message: "Username sudah digunakan" });
    }

    // cek email unik
    const [u2]: any = await db.query(
      "SELECT id FROM pengguna WHERE email = ?",
      [email]
    );
    if (u2.length > 0) {
      return res.status(400).json({ message: "Email sudah digunakan" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const [result]: any = await db.query(
      `INSERT INTO pengguna (username, email, password_hash, role, status)
       VALUES (?, ?, ?, ?, ?)`,
      [username, email, hashed, role, "Aktif"]
    );

    return res.status(201).json({
      id: result.insertId,
      username,
      email,
      role,
      status: "Aktif",
    });
  } catch (err) {
    console.error("tambahPengguna error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function updatePengguna(req: Request, res: Response) {
  const id = Number(req.params.id);
  let { username, email, role, status } = req.body as {
    username?: string;
    email?: string;
    role?: string;
    status?: string;
  };

  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ message: "ID tidak valid" });
  }

  // status optional, tapi kalau ada harus valid
  if (status && !["Aktif", "Nonaktif"].includes(status)) {
    return res.status(400).json({
      message: "Status harus 'Aktif' atau 'Nonaktif'",
    });
  }

  // ketua tidak boleh menonaktifkan dirinya sendiri
  if (status === "Nonaktif" && (req as any).user?.id === id) {
    return res.status(400).json({
      message: "Ketua tidak dapat menonaktifkan akunnya sendiri",
    });
  }

  // role optional, tapi kalau ada harus valid
  if (role) {
    role = role.toUpperCase();
    if (!allowedRoles.includes(role as any)) {
      return res.status(400).json({ message: "Role tidak valid" });
    }
  }

  try {
    // cek apakah user ada
    const [exists]: any = await db.query(
      "SELECT id FROM pengguna WHERE id = ?",
      [id]
    );
    if (exists.length === 0) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan" });
    }

    // Email wajib dicek validitas kalau dikirim
    if (email) {
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Format email tidak valid" });
      }

      // email unik kecuali diri sendiri
      const [u2]: any = await db.query(
        "SELECT id FROM pengguna WHERE email = ? AND id <> ?",
        [email, id]
      );
      if (u2.length > 0) {
        return res.status(400).json({ message: "Email sudah digunakan" });
      }
    }

    // username unik kecuali diri sendiri
    if (username) {
      const [u1]: any = await db.query(
        "SELECT id FROM pengguna WHERE username = ? AND id <> ?",
        [username, id]
      );
      if (u1.length > 0) {
        return res.status(400).json({ message: "Username sudah digunakan" });
      }
    }

    // 🔥 Build dynamic update query
    const fields: string[] = [];
    const values: any[] = [];

    if (username) {
      fields.push("username = ?");
      values.push(username);
    }

    if (email) {
      fields.push("email = ?");
      values.push(email);
    }

    if (role) {
      fields.push("role = ?");
      values.push(role);
    }

    if (status) {
      fields.push("status = ?");
      values.push(status);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: "Tidak ada data yang diubah" });
    }

    values.push(id);

    await db.query(
      `UPDATE pengguna SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    return res.json({
      id,
      username,
      email,
      role,
      status,
    });
  } catch (err) {
    console.error("updatePengguna error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// ======================================================
// RESET PASSWORD
// ======================================================
export async function updatepasswordPengguna(req: Request, res: Response) {
  const id = Number(req.params.id);
  const { newPassword } = req.body as { newPassword?: string };

  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ message: "ID tidak valid" });
  }

  if (!newPassword || newPassword.length < 8) {
    return res
      .status(400)
      .json({ message: "Password baru minimal 8 karakter" });
  }

  try {
    const [userRows]: any = await db.query(
      "SELECT id FROM pengguna WHERE id = ?",
      [id]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await db.query(`UPDATE pengguna SET password_hash = ? WHERE id = ?`, [
      hashed,
      id,
    ]);

    return res.json({ message: "Password berhasil di-reset" });
  } catch (err) {
    console.error("resetUserPassword error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// ======================================================
// DELETE USER
// ======================================================
export async function hapusPengguna(req: Request, res: Response) {
  const id = Number(req.params.id);

  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ message: "ID tidak valid" });
  }

  // Ketua tidak boleh menghapus dirinya sendiri
  if ((req as any).user && (req as any).user.id === id) {
    return res
      .status(400)
      .json({ message: "Ketua tidak dapat menghapus akunnya sendiri" });
  }

  try {
    // Cek apakah user punya transaksi
    const [trxRows]: any = await db.query(
      "SELECT COUNT(*) AS total FROM transaksi WHERE pengguna_id = ?",
      [id]
    );

    if (trxRows[0].total > 0) {
      return res.status(400).json({
        message:
          "Pengguna memiliki riwayat transaksi dan tidak dapat dihapus. Nonaktifkan saja.",
      });
    }

    const [result]: any = await db.query("DELETE FROM pengguna WHERE id = ?", [
      id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan" });
    }

    return res.json({ message: "Pengguna berhasil dihapus" });
  } catch (err) {
    console.error("deleteUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
