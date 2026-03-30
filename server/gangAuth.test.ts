import { describe, expect, it, beforeAll } from "vitest";
import { hashPassword, verifyPassword, canAccessGang } from "./gangAuth";
import type { GangUser } from "../drizzle/schema";

describe("hashPassword & verifyPassword", () => {
  it("hashes a password and verifies it correctly", async () => {
    const password = "TestPass123!";
    const hash = await hashPassword(password);
    expect(hash).toBeTruthy();
    expect(hash).not.toBe(password);
    const valid = await verifyPassword(password, hash);
    expect(valid).toBe(true);
  });

  it("returns false for wrong password", async () => {
    const hash = await hashPassword("correct_password");
    const valid = await verifyPassword("wrong_password", hash);
    expect(valid).toBe(false);
  });
});

describe("canAccessGang", () => {
  const makeUser = (role: GangUser["role"], gangId: number | null): GangUser => ({
    id: 1,
    username: "test",
    passwordHash: "hash",
    displayName: "Test",
    role,
    gangId,
    gangRank: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLogin: null,
  });

  it("superadmin can access any gang", () => {
    const user = makeUser("superadmin", null);
    expect(canAccessGang(user, 1)).toBe(true);
    expect(canAccessGang(user, 2)).toBe(true);
    expect(canAccessGang(user, 3)).toBe(true);
  });

  it("gang_admin can only access their own gang", () => {
    const user = makeUser("gang_admin", 2);
    expect(canAccessGang(user, 1)).toBe(false);
    expect(canAccessGang(user, 2)).toBe(true);
    expect(canAccessGang(user, 3)).toBe(false);
  });

  it("gang_supervisor can only access their own gang", () => {
    const user = makeUser("gang_supervisor", 3);
    expect(canAccessGang(user, 1)).toBe(false);
    expect(canAccessGang(user, 2)).toBe(false);
    expect(canAccessGang(user, 3)).toBe(true);
  });

  it("gang_admin with null gangId cannot access any gang", () => {
    const user = makeUser("gang_admin", null);
    expect(canAccessGang(user, 1)).toBe(false);
    expect(canAccessGang(user, 2)).toBe(false);
  });

  it("gang_supervisor with null gangId (all-gangs) can access any gang", () => {
    const user = makeUser("gang_supervisor", null);
    // supervisor with null gangId = all-gangs access
    expect(canAccessGang(user, 1)).toBe(true);
    expect(canAccessGang(user, 2)).toBe(true);
    expect(canAccessGang(user, 3)).toBe(true);
  });

  it("recruiter can only access their own gang", () => {
    const user = makeUser("recruiter", 1);
    expect(canAccessGang(user, 1)).toBe(true);
    expect(canAccessGang(user, 2)).toBe(false);
    expect(canAccessGang(user, 3)).toBe(false);
  });
});
