import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { dbService, isMockDatabase } from "../services/dbService.js";
import { hashPassword, comparePassword, generateToken } from "../utils/authUtils.js";

export async function register(req: AuthenticatedRequest, res: Response) {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, email, and password are required." });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: "Username must be at least 3 characters long." });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }

    // Check if email already registered
    const existing = await dbService.findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: "An account with this email already exists." });
    }

    const passwordHash = await hashPassword(password);
    const user = await dbService.createUser(username, email, passwordHash);
    const token = generateToken(user);

    return res.status(201).json({
      message: "Registration successful",
      token,
      user,
      isMock: isMockDatabase,
    });
  } catch (err: any) {
    console.error("Register Error:", err);
    return res.status(500).json({ error: err.message || "An error occurred during registration." });
  }
}

export async function login(req: AuthenticatedRequest, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await dbService.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const passwordMatch = await comparePassword(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = generateToken(user);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      },
      isMock: isMockDatabase,
    });
  } catch (err: any) {
    console.error("Login Error:", err);
    return res.status(500).json({ error: err.message || "An error occurred during login." });
  }
}

export async function getProfile(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated." });
    }

    const user = await dbService.findUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.status(200).json({ user, isMock: isMockDatabase });
  } catch (err: any) {
    console.error("GetProfile Error:", err);
    return res.status(500).json({ error: err.message || "An error occurred retrieving profile." });
  }
}
