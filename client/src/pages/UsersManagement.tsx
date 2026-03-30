import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useGangAuth } from "@/contexts/GangAuthContext";
import GangDashboardLayout, { GANG_NAMES } from "@/components/GangDashboardLayout";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, ToggleLeft, ToggleRight, Key, Copy, Eye, EyeOff } from "lucide-react";

const GANG_OPTIONS = [
  { id: 1, label: "➥👾〡Nova Blinders" },
  { id: 2, label: "➥🕸️〡Death Valley" },
  { id: 3, label: "➥🚬〡Old School" },
];

const RANKS_ADMIN = [
  "𝐆𝐀𝐍𝐆 𝐋𝐄𝐀𝐃𝐄𝐑 ♔",
  "𝐆𝐀𝐍𝐆 𝐂𝐎 𝐋𝐄𝐀𝐃𝐄𝐑 ♔",
  "𝐆𝐀𝐍𝐆 𝐂𝐄𝐎 ♔",
  "𝐆𝐀𝐍𝐆 𝐂𝐨𝐦𝐦𝐚𝐧𝐝𝐞𝐫 ♔",
];

const RANKS_MEMBER = [
  "𝐆𝐀𝐍𝐆 𝐁𝐎𝐒𝐒 ✯",
  "𝐆𝐀𝐍𝐆 𝐌𝐀𝐍𝐀𝐆𝐄𝐑 ✯",
  "𝐆𝐀𝐍𝐆 𝐀𝐃𝐕𝐈𝐒𝐎𝐑",
  "𝐆𝐀𝐍𝐆 𝐂𝐑𝐈𝐌𝐈𝐍𝐀𝐋",
  "𝐆𝐚𝐧𝐠 𝐊𝐢𝐥𝐥𝐞𝐫",
];

const RANKS_SUPERVISOR = [
  "🏴〡𝐒𝐈𝐋𝐄𝐍𝐓 𝐇𝐀𝐍𝐃",
  "➥♕  𝐁𝐈𝐆 𝐁𝐎𝐒𝐒",
];

export default function UsersManagement() {
  const { gangUser, loading, isSuperAdmin } = useGangAuth();
  const [, navigate] = useLocation();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", displayName: "", role: "gang_admin" as "gang_admin" | "gang_supervisor" | "recruiter", gangId: 1, gangRank: "" });
  const [showPass, setShowPass] = useState(false);
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (!loading && !isSuperAdmin) navigate("/dashboard");
  }, [loading, isSuperAdmin]);

  const utils = trpc.useUtils();
  const { data: users, isLoading } = trpc.superadmin.listUsers.useQuery();

  const createMutation = trpc.superadmin.createUser.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء الحساب بنجاح");
      setShowCreate(false);
      setForm({ username: "", password: "", displayName: "", role: "gang_admin" as "gang_admin" | "gang_supervisor" | "recruiter", gangId: 1, gangRank: "" });
      utils.superadmin.listUsers.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleMutation = trpc.superadmin.toggleUser.useMutation({
    onSuccess: () => { utils.superadmin.listUsers.invalidate(); toast.success("تم تحديث الحالة"); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.superadmin.deleteUser.useMutation({
    onSuccess: () => { utils.superadmin.listUsers.invalidate(); toast.success("تم حذف المستخدم"); },
    onError: (e) => toast.error(e.message),
  });

  const resetMutation = trpc.superadmin.resetPassword.useMutation({
    onSuccess: () => { setResetUserId(null); setNewPassword(""); toast.success("تم تغيير كلمة المرور"); },
    onError: (e) => toast.error(e.message),
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم النسخ!");
  };

  const roleLabel = (role: string) => ({ superadmin: "مشرف رئيسي", gang_admin: "مسؤول عصابة", gang_supervisor: "مشرف عصابة", recruiter: "مسؤول التوظيف" }[role] ?? role);

  if (loading || isLoading) return (
    <GangDashboardLayout title="إدارة المستخدمين">
      <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>
    </GangDashboardLayout>
  );

  return (
    <GangDashboardLayout title="إدارة المستخدمين">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">إدارة المستخدمين</h2>
            <p className="text-gray-500 text-sm">إنشاء وإدارة حسابات مسؤولي العصابات</p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            إنشاء حساب جديد
          </button>
        </div>

        {/* Create Form */}
        {showCreate && (
          <div className="bg-[#12121a] border border-purple-700/40 rounded-2xl p-6">
            <h3 className="text-white font-bold mb-4">إنشاء حساب جديد</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">اسم المستخدم</label>
                <input
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="مثال: nova_admin"
                  className="w-full bg-[#1a1a2e] border border-purple-900/40 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">الاسم الظاهر</label>
                <input
                  value={form.displayName}
                  onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                  placeholder="مثال: مسؤول Nova"
                  className="w-full bg-[#1a1a2e] border border-purple-900/40 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">كلمة المرور</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="6 أحرف على الأقل"
                    className="w-full bg-[#1a1a2e] border border-purple-900/40 rounded-xl py-2.5 px-4 pl-10 text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">الصلاحية</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value as "gang_admin" | "gang_supervisor" | "recruiter" }))}
                  className="w-full bg-[#1a1a2e] border border-purple-900/40 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="gang_admin">مسؤول عصابة</option>
                  <option value="gang_supervisor">مشرف عصابة</option>
                  <option value="recruiter">مسؤول التوظيف</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">العصابة</label>
                <select
                  value={form.gangId}
                  onChange={e => setForm(f => ({ ...f, gangId: Number(e.target.value) }))}
                  className="w-full bg-[#1a1a2e] border border-purple-900/40 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  {(form.role === "gang_supervisor" || form.role === "recruiter") && (
                    <>
                      <option value={0}>★ الكل (صلاحية عامة)</option>
                      <option value={-1}>— لا ينتمي لعصابة</option>
                    </>
                  )}
                  {GANG_OPTIONS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm text-gray-400 mb-1 block">الرتبة</label>
                <select
                  value={form.gangRank}
                  onChange={e => setForm(f => ({ ...f, gangRank: e.target.value }))}
                  className="w-full bg-[#1a1a2e] border border-purple-900/40 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="">-- اختر الرتبة --</option>
                  <optgroup label="── المسؤولون ──">
                    {RANKS_ADMIN.map(r => <option key={r} value={r}>{r}</option>)}
                  </optgroup>
                  <optgroup label="── الأعضاء ──">
                    {RANKS_MEMBER.map(r => <option key={r} value={r}>{r}</option>)}
                  </optgroup>
                  <optgroup label="── المشرفون ──">
                    {RANKS_SUPERVISOR.map(r => <option key={r} value={r}>{r}</option>)}
                  </optgroup>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => createMutation.mutate({ ...form, gangRank: form.gangRank || undefined })}
                disabled={createMutation.isPending}
                className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                إنشاء
              </button>
              <button onClick={() => setShowCreate(false)} className="px-5 py-2 rounded-xl text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 transition-colors">
                إلغاء
              </button>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-[#12121a] border border-purple-900/20 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-purple-900/20">
                  <th className="text-right text-xs text-gray-500 font-medium px-5 py-3">المستخدم</th>
                  <th className="text-right text-xs text-gray-500 font-medium px-5 py-3">الرتبة</th>
                  <th className="text-right text-xs text-gray-500 font-medium px-5 py-3">الصلاحية</th>
                  <th className="text-right text-xs text-gray-500 font-medium px-5 py-3">العصابة</th>
                  <th className="text-right text-xs text-gray-500 font-medium px-5 py-3">الحالة</th>
                  <th className="text-right text-xs text-gray-500 font-medium px-5 py-3">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {users?.filter(u => u.role !== "superadmin").map(user => (
                  <tr key={user.id} className="border-b border-purple-900/10 hover:bg-purple-900/5 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-700/30 flex items-center justify-center text-purple-300 text-sm font-bold">
                          {user.displayName[0]}
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{user.displayName}</p>
                          <div className="flex items-center gap-1">
                            <p className="text-gray-500 text-xs">@{user.username}</p>
                            <button onClick={() => copyToClipboard(user.username)} className="text-gray-600 hover:text-purple-400">
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs text-amber-300 font-medium">{(user as any).gangRank || "—"}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs bg-purple-900/30 text-purple-300 px-2 py-1 rounded-lg">{roleLabel(user.role)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-gray-300">
                        {user.gangId ? GANG_NAMES[user.gangId]?.display : "—"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2 py-1 rounded-lg ${user.isActive ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
                        {user.isActive ? "نشط" : "معطّل"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleMutation.mutate({ userId: user.id, isActive: !user.isActive })}
                          className={`p-1.5 rounded-lg transition-colors ${user.isActive ? "text-amber-400 hover:bg-amber-900/20" : "text-green-400 hover:bg-green-900/20"}`}
                          title={user.isActive ? "تعطيل" : "تفعيل"}
                        >
                          {user.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => { setResetUserId(user.id); setNewPassword(""); }}
                          className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-900/20 transition-colors"
                          title="تغيير كلمة المرور"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { if (confirm("هل أنت متأكد من حذف هذا المستخدم؟")) deleteMutation.mutate({ userId: user.id }); }}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-900/20 transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!users || users.filter(u => u.role !== "superadmin").length === 0) && (
              <div className="text-center py-12 text-gray-600">لا يوجد مستخدمون بعد</div>
            )}
          </div>
        </div>

        {/* Reset Password Modal */}
        {resetUserId && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" dir="rtl">
            <div className="bg-[#12121a] border border-purple-700/40 rounded-2xl p-6 w-full max-w-sm mx-4">
              <h3 className="text-white font-bold mb-4">تغيير كلمة المرور</h3>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="كلمة المرور الجديدة"
                className="w-full bg-[#1a1a2e] border border-purple-900/40 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-purple-500 mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => resetMutation.mutate({ userId: resetUserId, newPassword })}
                  disabled={resetMutation.isPending || newPassword.length < 6}
                  className="flex-1 bg-purple-700 hover:bg-purple-600 text-white py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {resetMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "تغيير"}
                </button>
                <button onClick={() => setResetUserId(null)} className="flex-1 border border-gray-700 text-gray-400 py-2 rounded-xl text-sm hover:border-gray-500 transition-colors">
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </GangDashboardLayout>
  );
}
