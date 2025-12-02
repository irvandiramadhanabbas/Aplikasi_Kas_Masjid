import { Request, Response } from "express";
import { db } from "../db";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Email dan password wajib diisi",
    });
  }

  try {
    const [rows]: any = await db.query(
      `SELECT id, username, email, password_hash, role, status
       FROM pengguna
       WHERE email = ?`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        message: "Email atau password salah",
      });
    }

    const user = rows[0];

    if (user.status !== "Aktif") {
      return res.status(403).json({
        message: "Akun dinonaktifkan",
      });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({
        message: "Email atau password salah",
      });
    }

    const secret = process.env.JWT_SECRET || "secret";

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      secret,
      { expiresIn: "8h" } as SignOptions
    );

    return res.json({
      message: "Login berhasil",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
