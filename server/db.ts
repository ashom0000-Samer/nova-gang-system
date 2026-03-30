import { eq, and, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, gangUsers, gangs, gangMembers, memberWarnings, reports, announcements, scenarios, scenarioParticipations, attendance, activityLog, gangSessions, InsertGangUser, InsertGangMember, InsertReport, InsertAnnouncement, InsertScenario, InsertAttendance } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ===================== CORE AUTH =====================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ===================== GANG AUTH =====================

export async function getGangUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(gangUsers).where(eq(gangUsers.username, username)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getGangUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(gangUsers).where(eq(gangUsers.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createGangUser(data: InsertGangUser) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(gangUsers).values(data);
}

export async function updateGangUserLastLogin(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(gangUsers).set({ lastLogin: new Date() }).where(eq(gangUsers.id, id));
}

export async function getAllGangUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(gangUsers).orderBy(desc(gangUsers.createdAt));
}

export async function updateGangUserPassword(id: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(gangUsers).set({ passwordHash }).where(eq(gangUsers.id, id));
}

export async function toggleGangUserActive(id: number, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(gangUsers).set({ isActive }).where(eq(gangUsers.id, id));
}

export async function deleteGangUser(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(gangUsers).where(eq(gangUsers.id, id));
}

// ===================== SESSIONS =====================

export async function createSession(gangUserId: number, token: string, expiresAt: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(gangSessions).values({ gangUserId, token, expiresAt });
}

export async function getSessionByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(gangSessions).where(eq(gangSessions.token, token)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function deleteSession(token: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(gangSessions).where(eq(gangSessions.token, token));
}

export async function deleteExpiredSessions() {
  const db = await getDb();
  if (!db) return;
  const now = Date.now();
  await db.delete(gangSessions).where(sql`${gangSessions.expiresAt} < ${now}`);
}

// ===================== GANGS =====================

export async function getAllGangs() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(gangs).where(eq(gangs.isActive, true));
}

export async function getGangById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(gangs).where(eq(gangs.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ===================== GANG MEMBERS =====================

export async function getMembersByGang(gangId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(gangMembers).where(eq(gangMembers.gangId, gangId)).orderBy(desc(gangMembers.joinedAt));
}

export async function getMemberById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(gangMembers).where(eq(gangMembers.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function addMember(data: InsertGangMember) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(gangMembers).values(data);
  return result;
}

export async function updateMemberStatus(id: number, status: "active" | "warned" | "suspended" | "fired") {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(gangMembers).set({ status }).where(eq(gangMembers.id, id));
}

export async function updateMemberRank(id: number, rank: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(gangMembers).set({ rank }).where(eq(gangMembers.id, id));
}

export async function incrementMemberWarnings(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(gangMembers).set({ warningCount: sql`${gangMembers.warningCount} + 1`, status: "warned" }).where(eq(gangMembers.id, id));
}

export async function deleteMember(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(gangMembers).where(eq(gangMembers.id, id));
}

export async function getGangMemberCount(gangId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(gangMembers).where(and(eq(gangMembers.gangId, gangId), eq(gangMembers.status, "active")));
  return result[0]?.count ?? 0;
}

// ===================== WARNINGS =====================

export async function addWarning(memberId: number, gangId: number, reason: string, issuedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(memberWarnings).values({ memberId, gangId, reason, issuedBy });
  await incrementMemberWarnings(memberId);
}

export async function getWarningsByMember(memberId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(memberWarnings).where(eq(memberWarnings.memberId, memberId)).orderBy(desc(memberWarnings.issuedAt));
}

export async function getWarningsByGang(gangId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(memberWarnings).where(eq(memberWarnings.gangId, gangId)).orderBy(desc(memberWarnings.issuedAt));
}

// ===================== REPORTS =====================

export async function createReport(data: InsertReport) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(reports).values(data);
}

export async function getReportsByGang(gangId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reports).where(eq(reports.gangId, gangId)).orderBy(desc(reports.createdAt));
}

export async function getReportsByAuthor(authorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reports).where(eq(reports.authorId, authorId)).orderBy(desc(reports.createdAt));
}

export async function getAllReports() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reports).orderBy(desc(reports.createdAt));
}

export async function updateReportStatus(id: number, status: "pending" | "reviewed" | "closed") {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(reports).set({ status }).where(eq(reports.id, id));
}

// ===================== ANNOUNCEMENTS =====================

export async function createAnnouncement(data: InsertAnnouncement) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(announcements).values(data);
}

export async function getAnnouncementsByGang(gangId: number) {
  const db = await getDb();
  if (!db) return [];
  // get gang-specific + global announcements
  return db.select().from(announcements).where(
    and(eq(announcements.isActive, true), sql`(${announcements.gangId} = ${gangId} OR ${announcements.gangId} IS NULL)`)
  ).orderBy(desc(announcements.createdAt));
}

export async function getAllAnnouncements() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(announcements).where(eq(announcements.isActive, true)).orderBy(desc(announcements.createdAt));
}

export async function deleteAnnouncement(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(announcements).set({ isActive: false }).where(eq(announcements.id, id));
}

// ===================== SCENARIOS =====================

export async function createScenario(data: InsertScenario) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(scenarios).values(data);
  return result;
}

export async function getScenariosByGang(gangId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scenarios).where(eq(scenarios.gangId, gangId)).orderBy(desc(scenarios.scenarioDate));
}

export async function addScenarioParticipation(data: { scenarioId: number; gangId: number; memberId?: number; gangUserId?: number; participantName: string; role?: string; notes?: string; addedBy: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(scenarioParticipations).values(data);
}

export async function getParticipationsByScenario(scenarioId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scenarioParticipations).where(eq(scenarioParticipations.scenarioId, scenarioId));
}

export async function getParticipationsByGang(gangId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scenarioParticipations).where(eq(scenarioParticipations.gangId, gangId)).orderBy(desc(scenarioParticipations.createdAt));
}

// ===================== ATTENDANCE =====================

export async function recordAttendance(data: InsertAttendance) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(attendance).values(data);
}

export async function getAttendanceByGang(gangId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(attendance).where(eq(attendance.gangId, gangId)).orderBy(desc(attendance.attendanceDate));
}

// ===================== ACTIVITY LOG =====================

export async function logActivity(gangId: number | null, performedBy: number, action: string, targetType?: string, targetId?: number, details?: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(activityLog).values({ gangId, performedBy, action, targetType, targetId, details });
}

export async function getActivityByGang(gangId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(activityLog).where(eq(activityLog.gangId, gangId)).orderBy(desc(activityLog.createdAt)).limit(50);
}

export async function getAllActivity() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(100);
}

// ===================== STATS =====================

export async function getGangStats(gangId: number) {
  const db = await getDb();
  if (!db) return { totalMembers: 0, activeMembers: 0, warnedMembers: 0, firedMembers: 0, totalReports: 0, totalScenarios: 0 };

  const [memberStats, reportCount, scenarioCount] = await Promise.all([
    db.select({
      status: gangMembers.status,
      count: sql<number>`count(*)`
    }).from(gangMembers).where(eq(gangMembers.gangId, gangId)).groupBy(gangMembers.status),
    db.select({ count: sql<number>`count(*)` }).from(reports).where(eq(reports.gangId, gangId)),
    db.select({ count: sql<number>`count(*)` }).from(scenarios).where(eq(scenarios.gangId, gangId)),
  ]);

  const stats = { totalMembers: 0, activeMembers: 0, warnedMembers: 0, suspendedMembers: 0, firedMembers: 0, totalReports: 0, totalScenarios: 0 };
  for (const row of memberStats) {
    stats.totalMembers += row.count;
    if (row.status === "active") stats.activeMembers = row.count;
    if (row.status === "warned") stats.warnedMembers = row.count;
    if (row.status === "suspended") stats.suspendedMembers = row.count;
    if (row.status === "fired") stats.firedMembers = row.count;
  }
  stats.totalReports = reportCount[0]?.count ?? 0;
  stats.totalScenarios = scenarioCount[0]?.count ?? 0;
  return stats;
}

// ===================== COMPLAINTS =====================

import { complaints, departments, disciplinaryActions, InsertComplaint, InsertDepartment, InsertDisciplinaryAction } from "../drizzle/schema";

export async function createComplaint(data: InsertComplaint) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(complaints).values(data);
}

export async function getComplaintsByGang(gangId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(complaints).where(eq(complaints.gangId, gangId)).orderBy(desc(complaints.createdAt));
}

export async function getAllComplaints() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(complaints).orderBy(desc(complaints.createdAt));
}

export async function updateComplaintStatus(id: number, status: "pending" | "reviewed" | "resolved" | "rejected", reviewedBy: number, reviewNote?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(complaints).set({ status, reviewedBy, reviewNote: reviewNote ?? null }).where(eq(complaints.id, id));
}

// ===================== DEPARTMENTS =====================

export async function createDepartment(data: InsertDepartment) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(departments).values(data);
}

export async function getDepartmentsByGang(gangId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(departments).where(and(eq(departments.gangId, gangId), eq(departments.isActive, true))).orderBy(departments.name);
}

export async function deleteDepartment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(departments).set({ isActive: false }).where(eq(departments.id, id));
}

// ===================== DISCIPLINARY ACTIONS =====================

export async function createDisciplinaryAction(data: InsertDisciplinaryAction) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(disciplinaryActions).values(data);
}

export async function getDisciplinaryByGang(gangId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(disciplinaryActions).where(eq(disciplinaryActions.gangId, gangId)).orderBy(desc(disciplinaryActions.issuedAt));
}

export async function getDisciplinaryByMember(memberId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(disciplinaryActions).where(eq(disciplinaryActions.memberId, memberId)).orderBy(desc(disciplinaryActions.issuedAt));
}

// ===================== APPLICANTS & QUIZ =====================

import { applicants, quizResults, InsertApplicant, InsertQuizResult } from "../drizzle/schema";

export async function createApplicant(data: InsertApplicant) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(applicants).values(data);
  return result;
}

export async function getApplicantsByGang(gangId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(applicants).where(eq(applicants.gangId, gangId)).orderBy(desc(applicants.createdAt));
}

export async function getAllApplicants() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(applicants).orderBy(desc(applicants.createdAt));
}

export async function getApplicantById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(applicants).where(eq(applicants.id, id)).limit(1);
  return result[0] ?? null;
}

export async function updateApplicantStatus(
  id: number,
  status: "pending" | "passed" | "failed" | "accepted" | "rejected",
  notes?: string
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(applicants).set({ status, notes: notes ?? null }).where(eq(applicants.id, id));
}

export async function saveQuizResult(data: InsertQuizResult) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(quizResults).values(data);
}

export async function getQuizResultByApplicant(applicantId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(quizResults).where(eq(quizResults.applicantId, applicantId)).orderBy(desc(quizResults.takenAt)).limit(1);
  return result[0] ?? null;
}

export async function getQuizResultsByGang(gangId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quizResults).where(eq(quizResults.gangId, gangId)).orderBy(desc(quizResults.takenAt));
}
