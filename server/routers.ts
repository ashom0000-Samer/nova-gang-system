import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { loginGangUser, logoutGangUser, validateSession, createGangAdminUser, canAccessGang, hashPassword } from "./gangAuth";
import {
  getAllGangs, getGangById, getMembersByGang, getMemberById, addMember, updateMemberStatus, updateMemberRank,
  addWarning, getWarningsByMember, getWarningsByGang, deleteMember,
  createReport, getReportsByGang, getReportsByAuthor, getAllReports, updateReportStatus,
  createAnnouncement, getAnnouncementsByGang, getAllAnnouncements, deleteAnnouncement,
  createScenario, getScenariosByGang, addScenarioParticipation, getParticipationsByScenario, getParticipationsByGang,
  recordAttendance, getAttendanceByGang,
  logActivity, getActivityByGang, getAllActivity,
  getGangStats, getAllGangUsers, toggleGangUserActive, deleteGangUser, updateGangUserPassword,
  createComplaint, getComplaintsByGang, getAllComplaints, updateComplaintStatus,
  createDepartment, getDepartmentsByGang, deleteDepartment,
  createDisciplinaryAction, getDisciplinaryByGang, getDisciplinaryByMember,
  createApplicant, getApplicantsByGang, getAllApplicants, getApplicantById, updateApplicantStatus,
  saveQuizResult, getQuizResultByApplicant, getQuizResultsByGang,
} from "./db";
import { notifyOwner } from "./_core/notification";
import { GangUser } from "../drizzle/schema";

const GANG_SESSION_COOKIE = "nova_gang_session";

// Helper to get current gang user from cookie
async function getGangUserFromCtx(ctx: { req: { headers: { cookie?: string } } }): Promise<GangUser | null> {
  const cookieHeader = ctx.req.headers.cookie || "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map(c => c.trim().split("=").map(decodeURIComponent))
  );
  const token = cookies[GANG_SESSION_COOKIE];
  if (!token) return null;
  return validateSession(token);
}

// Recruiter or admin procedure
const recruiterProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const gangUser = await getGangUserFromCtx(ctx);
  if (!gangUser) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول أولاً" });
  if (!['superadmin','gang_admin','gang_supervisor','recruiter'].includes(gangUser.role))
    throw new TRPCError({ code: "FORBIDDEN", message: "صلاحية مسؤول التوظيف مطلوبة" });
  return next({ ctx: { ...ctx, gangUser } });
});

// Gang-protected procedure
const gangProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const gangUser = await getGangUserFromCtx(ctx);
  if (!gangUser) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول أولاً" });
  return next({ ctx: { ...ctx, gangUser } });
});

// Superadmin-only procedure
const superadminProcedure = gangProcedure.use(({ ctx, next }) => {
  if (ctx.gangUser.role !== "superadmin") throw new TRPCError({ code: "FORBIDDEN", message: "هذه الصلاحية للمشرف الرئيسي فقط" });
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ===================== GANG AUTH =====================
  gangAuth: router({
    login: publicProcedure.input(z.object({
      username: z.string().min(1),
      password: z.string().min(1),
    })).mutation(async ({ input, ctx }) => {
      const result = await loginGangUser(input.username, input.password);
      if (!result) throw new TRPCError({ code: "UNAUTHORIZED", message: "اسم المستخدم أو كلمة المرور غير صحيحة" });

      const isSecure = ctx.req.protocol === "https" || (ctx.req.headers as Record<string, string>)["x-forwarded-proto"] === "https";
      ctx.res.cookie(GANG_SESSION_COOKIE, result.token, {
        httpOnly: true,
        secure: isSecure,
        sameSite: isSecure ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      return {
        user: {
          id: result.user.id,
          username: result.user.username,
          displayName: result.user.displayName,
          role: result.user.role,
          gangId: result.user.gangId,
          gangRank: result.user.gangRank ?? null,
        }
      };
    }),

    me: publicProcedure.query(async ({ ctx }) => {
      const gangUser = await getGangUserFromCtx(ctx);
      if (!gangUser) return null;
      return {
        id: gangUser.id,
        username: gangUser.username,
        displayName: gangUser.displayName,
        role: gangUser.role,
        gangId: gangUser.gangId,
        gangRank: gangUser.gangRank ?? null,
      };
    }),

    logout: publicProcedure.mutation(async ({ ctx }) => {
      const cookieHeader = ctx.req.headers.cookie || "";
      const cookies = Object.fromEntries(
        cookieHeader.split(";").map(c => c.trim().split("=").map(decodeURIComponent))
      );
      const token = cookies[GANG_SESSION_COOKIE];
      if (token) await logoutGangUser(token);
      ctx.res.clearCookie(GANG_SESSION_COOKIE, { path: "/" });
      return { success: true };
    }),

    changePassword: gangProcedure.input(z.object({
      newPassword: z.string().min(6),
    })).mutation(async ({ input, ctx }) => {
      const hash = await hashPassword(input.newPassword);
      await updateGangUserPassword(ctx.gangUser.id, hash);
      return { success: true };
    }),
  }),

  // ===================== GANGS =====================
  gangs: router({
    list: gangProcedure.query(async ({ ctx }) => {
      const allGangs = await getAllGangs();
      if (ctx.gangUser.role === "superadmin") return allGangs;
      return allGangs.filter(g => g.id === ctx.gangUser.gangId);
    }),

    get: gangProcedure.input(z.object({ gangId: z.number() })).query(async ({ input, ctx }) => {
      if (!canAccessGang(ctx.gangUser, input.gangId)) throw new TRPCError({ code: "FORBIDDEN" });
      return getGangById(input.gangId);
    }),

    stats: gangProcedure.input(z.object({ gangId: z.number() })).query(async ({ input, ctx }) => {
      if (!canAccessGang(ctx.gangUser, input.gangId)) throw new TRPCError({ code: "FORBIDDEN" });
      return getGangStats(input.gangId);
    }),

    allStats: superadminProcedure.query(async () => {
      const allGangs = await getAllGangs();
      const stats = await Promise.all(allGangs.map(async g => ({ gang: g, stats: await getGangStats(g.id) })));
      return stats;
    }),
  }),

  // ===================== SUPERADMIN =====================
  superadmin: router({
    createUser: superadminProcedure.input(z.object({
      username: z.string().min(3).max(64),
      password: z.string().min(6),
      displayName: z.string().min(1).max(128),
      role: z.enum(["gang_admin", "gang_supervisor", "recruiter"]),
      gangId: z.number(),
      gangRank: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      // gangId 0 = all gangs (supervisor), -1 = no gang
      const resolvedGangId = input.gangId <= 0 ? null : input.gangId;
      await createGangAdminUser({ ...input, gangId: resolvedGangId as number });
      await logActivity(null, ctx.gangUser.id, "create_user", "gang_user", undefined, `Created user: ${input.username} for gang ${input.gangId}`);
      await notifyOwner({ title: "مستخدم جديد", content: `تم إنشاء حساب جديد: ${input.displayName} (${input.username}) لعصابة ${input.gangId}` });
      return { success: true };
    }),

    listUsers: superadminProcedure.query(async () => {
      const users = await getAllGangUsers();
      return users.map(u => ({ ...u, passwordHash: undefined }));
    }),

    toggleUser: superadminProcedure.input(z.object({
      userId: z.number(),
      isActive: z.boolean(),
    })).mutation(async ({ input, ctx }) => {
      await toggleGangUserActive(input.userId, input.isActive);
      await logActivity(null, ctx.gangUser.id, input.isActive ? "activate_user" : "deactivate_user", "gang_user", input.userId);
      return { success: true };
    }),

    deleteUser: superadminProcedure.input(z.object({ userId: z.number() })).mutation(async ({ input, ctx }) => {
      await deleteGangUser(input.userId);
      await logActivity(null, ctx.gangUser.id, "delete_user", "gang_user", input.userId);
      return { success: true };
    }),

    resetPassword: superadminProcedure.input(z.object({
      userId: z.number(),
      newPassword: z.string().min(6),
    })).mutation(async ({ input, ctx }) => {
      const hash = await hashPassword(input.newPassword);
      await updateGangUserPassword(input.userId, hash);
      return { success: true };
    }),

    allActivity: superadminProcedure.query(async () => {
      return getAllActivity();
    }),

    allReports: superadminProcedure.query(async () => {
      return getAllReports();
    }),

    allAnnouncements: superadminProcedure.query(async () => {
      return getAllAnnouncements();
    }),

    createGlobalAnnouncement: superadminProcedure.input(z.object({
      title: z.string().min(1).max(256),
      content: z.string().min(1),
      priority: z.enum(["normal", "important", "urgent"]).default("normal"),
    })).mutation(async ({ input, ctx }) => {
      await createAnnouncement({ ...input, authorId: ctx.gangUser.id, gangId: undefined });
      await notifyOwner({ title: "إعلان عام جديد", content: `تم نشر إعلان عام: ${input.title}` });
      return { success: true };
    }),
  }),

  // ===================== MEMBERS =====================
  members: router({
    list: gangProcedure.input(z.object({ gangId: z.number() })).query(async ({ input, ctx }) => {
      if (!canAccessGang(ctx.gangUser, input.gangId)) throw new TRPCError({ code: "FORBIDDEN" });
      return getMembersByGang(input.gangId);
    }),

    add: gangProcedure.input(z.object({
      gangId: z.number(),
      playerName: z.string().min(1).max(128),
      playerId: z.string().optional(),
      rank: z.string().default("عضو"),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      if (!canAccessGang(ctx.gangUser, input.gangId)) throw new TRPCError({ code: "FORBIDDEN" });
      await addMember({ ...input, addedBy: ctx.gangUser.id });
      await logActivity(input.gangId, ctx.gangUser.id, "add_member", "member", undefined, `Added: ${input.playerName}`);
      await notifyOwner({ title: "عضو جديد", content: `تم إضافة عضو جديد: ${input.playerName} في العصابة ${input.gangId}` });
      return { success: true };
    }),

    remove: gangProcedure.input(z.object({ memberId: z.number(), gangId: z.number() })).mutation(async ({ input, ctx }) => {
      if (!canAccessGang(ctx.gangUser, input.gangId)) throw new TRPCError({ code: "FORBIDDEN" });
      const member = await getMemberById(input.memberId);
      if (!member || member.gangId !== input.gangId) throw new TRPCError({ code: "NOT_FOUND" });
      await deleteMember(input.memberId);
      await logActivity(input.gangId, ctx.gangUser.id, "remove_member", "member", input.memberId, `Removed: ${member.playerName}`);
      return { success: true };
    }),

    updateStatus: gangProcedure.input(z.object({
      memberId: z.number(),
      gangId: z.number(),
      status: z.enum(["active", "warned", "suspended", "fired"]),
    })).mutation(async ({ input, ctx }) => {
      if (!canAccessGang(ctx.gangUser, input.gangId)) throw new TRPCError({ code: "FORBIDDEN" });
      const member = await getMemberById(input.memberId);
      if (!member || member.gangId !== input.gangId) throw new TRPCError({ code: "NOT_FOUND" });
      await updateMemberStatus(input.memberId, input.status);
      await logActivity(input.gangId, ctx.gangUser.id, `status_${input.status}`, "member", input.memberId, `${member.playerName} → ${input.status}`);
      return { success: true };
    }),

    promote: gangProcedure.input(z.object({
      memberId: z.number(),
      gangId: z.number(),
      rank: z.string().min(1),
    })).mutation(async ({ input, ctx }) => {
      if (!canAccessGang(ctx.gangUser, input.gangId)) throw new TRPCError({ code: "FORBIDDEN" });
      const member = await getMemberById(input.memberId);
      if (!member || member.gangId !== input.gangId) throw new TRPCError({ code: "NOT_FOUND" });
      await updateMemberRank(input.memberId, input.rank);
      await logActivity(input.gangId, ctx.gangUser.id, "promote_member", "member", input.memberId, `${member.playerName} → ${input.rank}`);
      return { success: true };
    }),

    warn: gangProcedure.input(z.object({
      memberId: z.number(),
      gangId: z.number(),
      reason: z.string().min(1),
    })).mutation(async ({ input, ctx }) => {
      if (!canAccessGang(ctx.gangUser, input.gangId)) throw new TRPCError({ code: "FORBIDDEN" });
      const member = await getMemberById(input.memberId);
      if (!member || member.gangId !== input.gangId) throw new TRPCError({ code: "NOT_FOUND" });
      await addWarning(input.memberId, input.gangId, input.reason, ctx.gangUser.id);
      await logActivity(input.gangId, ctx.gangUser.id, "warn_member", "member", input.memberId, `${member.playerName}: ${input.reason}`);
      await notifyOwner({ title: "تحذير عضو", content: `تم تحذير ${member.playerName} في العصابة ${input.gangId}: ${input.reason}` });
      return { success: true };
    }),

    warnings: gangProcedure.input(z.object({ memberId: z.number(), gangId: z.number() })).query(async ({ input, ctx }) => {
      if (!canAccessGang(ctx.gangUser, input.gangId)) throw new TRPCError({ code: "FORBIDDEN" });
      return getWarningsByMember(input.memberId);
    }),

    gangWarnings: gangProcedure.input(z.object({ gangId: z.number() })).query(async ({ input, ctx }) => {
      if (!canAccessGang(ctx.gangUser, input.gangId)) throw new TRPCError({ code: "FORBIDDEN" });
      return getWarningsByGang(input.gangId);
    }),
  }),

  // ===================== REPORTS =====================
  reports: router({
    create: gangProcedure.input(z.object({
      gangId: z.number(),
      title: z.string().min(1).max(256),
      content: z.string().min(1),
      reportType: z.enum(["activity", "incident", "recruitment", "other"]).default("activity"),
    })).mutation(async ({ input, ctx }) => {
      if (!canAccessGang(ctx.gangUser, input.gangId)) throw new TRPCError({ code: "FORBIDDEN" });
      await createReport({ ...input, authorId: ctx.gangUser.id });
      await logActivity(input.gangId, ctx.gangUser.id, "create_report", "report", undefined, input.title);
      await notifyOwner({ title: "تقرير جديد", content: `تقرير جديد من ${ctx.gangUser.displayName}: ${input.title}` });
      return { success: true };
    }),

    list: gangProcedure.input(z.object({ gangId: z.number() })).query(async ({ input, ctx }) => {
      if (!canAccessGang(ctx.gangUser, input.gangId)) throw new TRPCError({ code: "FORBIDDEN" });
      return getReportsByGang(input.gangId);
    }),

    myReports: gangProcedure.query(async ({ ctx }) => {
      return getReportsByAuthor(ctx.gangUser.id);
    }),

    updateStatus: superadminProcedure.input(z.object({
      reportId: z.number(),
      status: z.enum(["pending", "reviewed", "closed"]),
    })).mutation(async ({ input, ctx }) => {
      await updateReportStatus(input.reportId, input.status);
      return { success: true };
    }),
  }),

  // ===================== ANNOUNCEMENTS =====================
  announcements: router({
    create: gangProcedure.input(z.object({
      gangId: z.number(),
      title: z.string().min(1).max(256),
      content: z.string().min(1),
      priority: z.enum(["normal", "important", "urgent"]).default("normal"),
    })).mutation(async ({ input, ctx }) => {
      if (!canAccessGang(ctx.gangUser, input.gangId)) throw new TRPCError({ code: "FORBIDDEN" });
      await createAnnouncement({ ...input, authorId: ctx.gangUser.id });
      await logActivity(input.gangId, ctx.gangUser.id, "create_announcement", "announcement", undefined, input.title);
      return { success: true };
    }),

    list: gangProcedure.input(z.object({ gangId: z.number() })).query(async ({ input, ctx }) => {
      if (!canAccessGang(ctx.gangUser, input.gangId)) throw new TRPCError({ code: "FORBIDDEN" });
      return getAnnouncementsByGang(input.gangId);
    }),

    delete: gangProcedure.input(z.object({ announcementId: z.number(), gangId: z.number() })).mutation(async ({ input, ctx }) => {
      if (!canAccessGang(ctx.gangUser, input.gangId)) throw new TRPCError({ code: "FORBIDDEN" });
      await deleteAnnouncement(input.announcementId);
      return { success: true };
    }),
  }),

  // ===================== SCENARIOS =====================
  scenarios: router({
    create: gangProcedure.input(z.object({
      gangId: z.number(),
      title: z.string().min(1).max(256),
      description: z.string().optional(),
      scenarioDate: z.string(),
    })).mutation(async ({ input, ctx }) => {
      if (!canAccessGang(ctx.gangUser, input.gangId)) throw new TRPCError({ code: "FORBIDDEN" });
      await createScenario({ ...input, scenarioDate: new Date(input.scenarioDate), createdBy: ctx.gangUser.id });
      await logActivity(input.gangId, ctx.gangUser.id, "create_scenario", "scenario", undefined, input.title);
      return { success: true };
    }),

    list: gangProcedure.input(z.object({ gangId: z.number() })).query(async ({ input, ctx }) => {
      if (!canAccessGang(ctx.gangUser, input.gangId)) throw new TRPCError({ code: "FORBIDDEN" });
      return getScenariosByGang(input.gangId);
    }),

    addParticipation: gangProcedure.input(z.object({
      scenarioId: z.number(),
      gangId: z.number(),
      participantName: z.string().min(1),
      memberId: z.number().optional(),
      role: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      if (!canAccessGang(ctx.gangUser, input.gangId)) throw new TRPCError({ code: "FORBIDDEN" });
      await addScenarioParticipation({ ...input, addedBy: ctx.gangUser.id });
      return { success: true };
    }),

    participations: gangProcedure.input(z.object({ scenarioId: z.number(), gangId: z.number() })).query(async ({ input, ctx }) => {
      if (!canAccessGang(ctx.gangUser, input.gangId)) throw new TRPCError({ code: "FORBIDDEN" });
      return getParticipationsByScenario(input.scenarioId);
    }),

    gangParticipations: gangProcedure.input(z.object({ gangId: z.number() })).query(async ({ input, ctx }) => {
      if (!canAccessGang(ctx.gangUser, input.gangId)) throw new TRPCError({ code: "FORBIDDEN" });
      return getParticipationsByGang(input.gangId);
    }),
  }),

  // ===================== ATTENDANCE =====================
  attendance: router({
    record: gangProcedure.input(z.object({
      gangId: z.number(),
      attendantName: z.string().min(1),
      attendanceDate: z.string(),
      sessionType: z.enum(["regular", "event", "training", "meeting"]).default("regular"),
      memberId: z.number().optional(),
      gangUserId: z.number().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      if (!canAccessGang(ctx.gangUser, input.gangId)) throw new TRPCError({ code: "FORBIDDEN" });
      await recordAttendance({ ...input, attendanceDate: new Date(input.attendanceDate), recordedBy: ctx.gangUser.id });
      await logActivity(input.gangId, ctx.gangUser.id, "record_attendance", "attendance", undefined, `${input.attendantName} - ${input.sessionType}`);
      return { success: true };
    }),

    list: gangProcedure.input(z.object({ gangId: z.number() })).query(async ({ input, ctx }) => {
      if (!canAccessGang(ctx.gangUser, input.gangId)) throw new TRPCError({ code: "FORBIDDEN" });
      return getAttendanceByGang(input.gangId);
    }),
  }),

  // ===================== ACTIVITY =====================
  activity: router({
    gangActivity: gangProcedure.input(z.object({ gangId: z.number() })).query(async ({ input, ctx }) => {
      if (!canAccessGang(ctx.gangUser, input.gangId)) throw new TRPCError({ code: "FORBIDDEN" });
      return getActivityByGang(input.gangId);
    }),
  }),

  // ===================== COMPLAINTS =====================
  complaints: router({
    submit: gangProcedure.input(z.object({
      gangId: z.number(),
      title: z.string().min(1).max(256),
      content: z.string().min(1),
    })).mutation(async ({ input, ctx }) => {
      if (!canAccessGang(ctx.gangUser, input.gangId)) throw new TRPCError({ code: "FORBIDDEN" });
      await createComplaint({ ...input, submittedBy: ctx.gangUser.id, submitterName: ctx.gangUser.displayName });
      await logActivity(input.gangId, ctx.gangUser.id, "submit_complaint", "complaint", undefined, input.title);
      await notifyOwner({ title: "شكوى جديدة", content: `شكوى جديدة من ${ctx.gangUser.displayName}: ${input.title}` });
      return { success: true };
    }),

    list: gangProcedure.input(z.object({ gangId: z.number() })).query(async ({ input, ctx }) => {
      if (!canAccessGang(ctx.gangUser, input.gangId)) throw new TRPCError({ code: "FORBIDDEN" });
      return getComplaintsByGang(input.gangId);
    }),

    all: superadminProcedure.query(async () => getAllComplaints()),

    review: gangProcedure.input(z.object({
      complaintId: z.number(),
      gangId: z.number(),
      status: z.enum(["reviewed", "resolved", "rejected"]),
      reviewNote: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      if (!canAccessGang(ctx.gangUser, input.gangId)) throw new TRPCError({ code: "FORBIDDEN" });
      await updateComplaintStatus(input.complaintId, input.status, ctx.gangUser.id, input.reviewNote);
      return { success: true };
    }),
  }),

  // ===================== DEPARTMENTS =====================
  departments: router({
    create: gangProcedure.input(z.object({
      gangId: z.number(),
      name: z.string().min(1).max(128),
      description: z.string().optional(),
      minRank: z.string().optional(),
      maxRank: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      if (!canAccessGang(ctx.gangUser, input.gangId)) throw new TRPCError({ code: "FORBIDDEN" });
      await createDepartment({ ...input, createdBy: ctx.gangUser.id });
      await logActivity(input.gangId, ctx.gangUser.id, "create_department", "department", undefined, input.name);
      return { success: true };
    }),

    list: gangProcedure.input(z.object({ gangId: z.number() })).query(async ({ input, ctx }) => {
      if (!canAccessGang(ctx.gangUser, input.gangId)) throw new TRPCError({ code: "FORBIDDEN" });
      return getDepartmentsByGang(input.gangId);
    }),

    delete: gangProcedure.input(z.object({ departmentId: z.number(), gangId: z.number() })).mutation(async ({ input, ctx }) => {
      if (!canAccessGang(ctx.gangUser, input.gangId)) throw new TRPCError({ code: "FORBIDDEN" });
      await deleteDepartment(input.departmentId);
      return { success: true };
    }),
  }),

  // ===================== RECRUITMENT & QUIZ =====================
  recruitment: router({
    // Add applicant
    addApplicant: recruiterProcedure.input(z.object({
      gangId: z.number(),
      applicantName: z.string().min(1).max(100),
      applicantUserId: z.string().min(1).max(64),
      applicantUsername: z.string().min(1).max(64),
    })).mutation(async ({ input, ctx }) => {
      if (!canAccessGang(ctx.gangUser, input.gangId)) throw new TRPCError({ code: "FORBIDDEN" });
      await createApplicant({
        ...input,
        recruiterUserId: String(ctx.gangUser.id),
        recruiterUsername: ctx.gangUser.displayName,
        status: "pending",
      });
      await logActivity(input.gangId, ctx.gangUser.id, "add_applicant", "applicant", undefined, `${input.applicantName} - ${input.applicantUsername}`);
      await notifyOwner({ title: "متقدم جديد للتوظيف", content: `${ctx.gangUser.displayName} أضاف متقدماً: ${input.applicantName} (${input.applicantUsername})` });
      return { success: true };
    }),

    // List applicants
    list: recruiterProcedure.input(z.object({ gangId: z.number() })).query(async ({ input, ctx }) => {
      if (!canAccessGang(ctx.gangUser, input.gangId)) throw new TRPCError({ code: "FORBIDDEN" });
      return getApplicantsByGang(input.gangId);
    }),

    all: superadminProcedure.query(async () => getAllApplicants()),

    // Update applicant status (accept/reject)
    updateStatus: recruiterProcedure.input(z.object({
      applicantId: z.number(),
      gangId: z.number(),
      status: z.enum(["pending", "passed", "failed", "accepted", "rejected"]),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      if (!canAccessGang(ctx.gangUser, input.gangId)) throw new TRPCError({ code: "FORBIDDEN" });
      await updateApplicantStatus(input.applicantId, input.status, input.notes);
      await logActivity(input.gangId, ctx.gangUser.id, `applicant_${input.status}`, "applicant", input.applicantId, input.notes ?? "");
      if (input.status === "accepted") {
        await notifyOwner({ title: "قبول متقدم", content: `${ctx.gangUser.displayName} قبل متقدماً في العصابة` });
      }
      return { success: true };
    }),

    // Submit quiz result
    submitQuiz: publicProcedure.input(z.object({
      applicantId: z.number(),
      gangId: z.number(),
      answers: z.array(z.number()), // index of chosen answer per question
    })).mutation(async ({ input }) => {
      // Quiz questions with correct answer indices (0-based)
      const CORRECT_ANSWERS = [1, 0, 2, 1, 1, 2, 3, 1, 0, 1, 0, 3, 1, 1, 2];
      // 0=15min,1=20min,2=10min,3=25min | 0=مسعفين,1=مواطنين,2=شرطة,3=عصابات
      // 0=دقيقتان,1=10دق,2=5دق,3=3دق | 0=نعم,1=لا | 0=لايحق,1=أقل5,2=قائدغايب
      // 0=أسبوع,1=يومين,2=3أيام,3=يوم | 0=مبلغ,1=أيوقت,2=7أيام,3=14يوم
      // 0=7أيام,1=14يوم,2=10أيام,3=شهر | 0=لايحق,1=نعم | 0=نعم,1=لا
      // 0=يمنع,1=نعم | 0=إنذار,1=إنذارين,2=خصم,3=طرد | 0=هروب,1=سيناريو,2=ترفيه,3=يمنع
      // 0=نعم,1=يمنع | 0=ثلاث,1=مرتين,2=واحدة,3=غيرمحدود
      let score = 0;
      for (let i = 0; i < CORRECT_ANSWERS.length; i++) {
        if (input.answers[i] === CORRECT_ANSWERS[i]) score++;
      }
      const passed = score >= 9;
      await saveQuizResult({
        applicantId: input.applicantId,
        gangId: input.gangId,
        score,
        totalQuestions: 15,
        passed,
        answers: JSON.stringify(input.answers),
      });
      await updateApplicantStatus(input.applicantId, passed ? "passed" : "failed");
      return { score, passed, total: 15 };
    }),

    // Get quiz result for applicant
    quizResult: recruiterProcedure.input(z.object({ applicantId: z.number(), gangId: z.number() })).query(async ({ input, ctx }) => {
      if (!canAccessGang(ctx.gangUser, input.gangId)) throw new TRPCError({ code: "FORBIDDEN" });
      return getQuizResultByApplicant(input.applicantId);
    }),
  }),

  // ===================== DISCIPLINARY =====================
  disciplinary: router({
    create: gangProcedure.input(z.object({
      gangId: z.number(),
      memberId: z.number().optional(),
      memberName: z.string().min(1),
      actionType: z.enum(["report1", "report2", "report3", "break", "promotion", "demotion"]),
      reason: z.string().min(1),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      if (!canAccessGang(ctx.gangUser, input.gangId)) throw new TRPCError({ code: "FORBIDDEN" });
      await createDisciplinaryAction({ ...input, issuedBy: ctx.gangUser.id });
      const actionLabel = { report1: "تقرير أول", report2: "تقرير ثاني", report3: "تقرير ثالث", break: "كسر", promotion: "ترقية", demotion: "تخفيض" }[input.actionType];
      await logActivity(input.gangId, ctx.gangUser.id, "disciplinary_action", "member", input.memberId, `${actionLabel} - ${input.memberName}`);
      await notifyOwner({ title: `إجراء تأديبي: ${actionLabel}`, content: `${ctx.gangUser.displayName} أصدر ${actionLabel} بحق ${input.memberName}: ${input.reason}` });
      return { success: true };
    }),

    list: gangProcedure.input(z.object({ gangId: z.number() })).query(async ({ input, ctx }) => {
      if (!canAccessGang(ctx.gangUser, input.gangId)) throw new TRPCError({ code: "FORBIDDEN" });
      return getDisciplinaryByGang(input.gangId);
    }),

    memberHistory: gangProcedure.input(z.object({ memberId: z.number(), gangId: z.number() })).query(async ({ input, ctx }) => {
      if (!canAccessGang(ctx.gangUser, input.gangId)) throw new TRPCError({ code: "FORBIDDEN" });
      return getDisciplinaryByMember(input.memberId);
    }),
  }),
});

export type AppRouter = typeof appRouter;
