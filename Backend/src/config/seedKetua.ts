import { db } from "../db";
import bcrypt from "bcryptjs";

async function seedKetua() {
  try {
    // cek sudah ada ketua belum
    const [rows]: any = await db.query(
      "SELECT id FROM pengguna WHERE role = 'KETUA' LIMIT 1"
    );

    if (rows.length > 0) {
      console.log("Ketua sudah ada. Skip.");
      process.exit();
    }

    const passwordHash = await bcrypt.hash("ketuamasjid2025", 10);

    await db.query(
      `INSERT INTO pengguna (username, email, password_hash, role, status)
       VALUES (?, ?, ?, ?, ?)`,
      ["Ketua", "ketuamasjid@masjid.id", passwordHash, "KETUA", "Aktif"]
    );

    console.log("User ketua berhasil dibuat!");
  } catch (err) {
    console.error("SEED ERROR:", err);
  } finally {
    process.exit();
  }
}

seedKetua();
