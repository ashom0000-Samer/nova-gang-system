import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import {
  getGangUserByUsername,
  getGangUserById,
  createSession,
  getSessionByToken,
  deleteSession,
  updateGangUserLastLogin,
  createGangUser,
  updateGangUserPassword,
} from "./db";
import { GangUser } from "../drizzle/schema";

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function loginGangUser(username: string, password: string): Promise<{ token: string; user: GangUser } | null> {
  const user = await getGangUserByUsername(username);
  if (!user || !user.isActive) return null;

  // Handle first-time superadmin login with placeholder password
  if (user.role === "superadmin" && user.passwordHash === "$2b$10$placeholder_will_be_set_on_first_run") {
    if (password === "nova@admin2025") {
      // Set a real password hash on first login
      const newHash = await hashPassword(password);
      await updateGangUserPassword(user.id, newHash);
    } else {
      return null;
    }
  } else {
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return null;
  }

  const token = nanoid(64);
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  await createSession(user.id, token, expiresAt);
  await updateGangUserLastLogin(user.id);

  return { token, user };
}

export async function validateSession(token: string): Promise<GangUser | null> {
  if (!token) return null;
  const session = await getSessionByToken(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    await deleteSession(token);
    return null;
  }
  const user = await getGangUserById(session.gangUserId);
  if (!user || !user.isActive) return null;
  return user;
}

export async function logoutGangUser(token: string): Promise<void> {
  await deleteSession(token);
}

export async function createGangAdminUser(data: {
  username: string;
  password: string;
  displayName: string;
  role: "gang_admin" | "gang_supervisor" | "recruiter";
  gangId: number;
  gangRank?: string;
}) {
  const passwordHash = await hashPassword(data.password);
  await createGangUser({
    username: data.username,
    passwordHash,
    displayName: data.displayName,
    role: data.role,
    gangId: data.gangId,
    gangRank: data.gangRank ?? null,
  });
}

export function canAccessGang(user: GangUser, gangId: number): boolean {
  if (user.role === "superadmin") return true;
  // supervisor with null gangId = all-gangs access
  if (user.role === "gang_supervisor" && user.gangId === null) return true;
  return user.gangId === gangId;
}
