import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useGangAuth } from "@/contexts/GangAuthContext";
import GangDashboardLayout, { GANG_COLORS, GANG_NAMES } from "@/components/GangDashboardLayout";
import { toast } from "sonner";
import { Loader2, Plus, TrendingUp, TrendingDown, AlertTriangle, Zap, FileWarning } from "lucide-react";

const ACTION_TYPES = [
  { value: "report1",  label: "تقرير أول",   icon: FileWarning,     color: "text-yellow-400 bg-yellow-900/20",  border: "border-yellow-700/30" },
  { value: "report2",  label: "تقرير ثاني",  icon: FileWarning,     color: "text-orange-400 bg-orange-900/20",  border: "border-orange-700/30" },
  { value: "report3",  label: "تقرير ثالث",  icon: AlertTriangle,   color: "text-red-400 bg-red-900/20",        border: "border-red-700/30" },
  { value: "break",    label: "كسر",         icon: Zap,             color: "text-pink-400 bg-pink-900/20",      border: "border-pink-700/30" },
  { value: "promotion",label: "ترقية",       icon: TrendingUp,      color: "text-green-400 bg-green-900/20",    border: "border-green-700/30" },
  { value: "demotion", label: "تخفيض",      icon: TrendingDown,    color: "text-gray-400 bg-gray-900/20",      border: "border-gray-700/30" },
];

const ALL_RANKS = [
  { group: "── المسؤولون ──", ranks: ["𝐆𝐀𝐍𝐆 𝐋𝐄𝐀𝐃𝐄𝐑 ♔", "𝐆𝐀𝐍𝐆 𝐂𝐎 𝐋𝐄𝐀𝐃𝐄𝐑 ♔", "𝐆𝐀𝐍𝐆 𝐂𝐄𝐎 ♔", "𝐆𝐀𝐍𝐆 𝐂𝐨𝐦𝐦𝐚𝐧𝐝𝐞𝐫 ♔"] },
  { group: "── الأعضاء ──",   ranks: ["𝐆𝐀𝐍𝐆 𝐁𝐎𝐒𝐒 ✯", "𝐆𝐀𝐍𝐆 𝐌𝐀𝐍𝐀𝐆𝐄𝐑 ✯", "𝐆𝐀𝐍𝐆 𝐀𝐃𝐕𝐈𝐒𝐎𝐑", "𝐆𝐀𝐍𝐆 𝐂𝐑𝐈𝐌𝐈𝐍𝐀𝐋", "𝐆𝐚𝐧𝐠 𝐊𝐢𝐥𝐥𝐞𝐫"] },
  { group: "── المشرفون ──",  ranks: ["🏴〡𝐒𝐈𝐋𝐄𝐍𝐓 𝐇𝐀𝐍𝐃", "➥♕  𝐁𝐈𝐆 𝐁𝐎𝐒𝐒"] },
];

export default function Disciplinary() {
  const { gangUser, loading, isAuthenticated } = useGangAuth();
  const [, navigate] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    memberName: "",
    memberId: "",
    actionType: "report1" as any,
    reason: "",
    notes: "",
  });
  const [filterType, setFilterType] = useState("all");

  useEffect(() => { if (!loading && !isAuthenticated) navigate("/"); }, [loading, isAuthenticated]);

  const gangId = gangUser?.gangId ?? 1;
  const gangSlug = gangUser?.gangId ? GANG_NAMES[gangUser.gangId]?.slug ?? "nova_blinders" : "nova_blinders";
  const colors = GANG_COLORS[gangSlug];
  const utils = trpc.useUtils();

  const { data: actions, isLoading } = trpc.disciplinary.list.useQuery({ gangId }, { enabled: !!gangUser });
  const { data: members } = trpc.members.list.useQuery({ gangId }, { enabled: !!gangUser });

  const createMutation = trpc.disciplinary.create.useMutation({
    onSuccess: () => {
      toast.success("تم تسجيل الإجراء بنجاح");
      setForm({ memberName: "", memberId: "", actionType: "report1", reason: "", notes: "" });
      setShowForm(false);
      utils.disciplinary.list.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  const filtered = (actions ?? []).filter(a => filterType === "all" || a.actionType === filterType);

  return (
    <GangDashboardLayout title="الإجراءات التأديبية">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">الإجراءات التأديبية</h2>
            <p className="text-gray-500 text-sm">تقارير، كسر، ترقيات، تخفيضات</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            إجراء جديد
          </button>
        </div>

        {/* Action Type Cards */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {ACTION_TYPES.map(at => {
            const Icon = at.icon;
            const count = (actions ?? []).filter(a => a.actionType === at.value).length;
            return (
              <button
                key={at.value}
                onClick={() => setFilterType(filterType === at.value ? "all" : at.value)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${filterType === at.value ? `${at.color} ${at.border}` : "bg-[#12121a] border-purple-900/20 hover:border-purple-700/30"}`}
              >
                <Icon className={`w-5 h-5 ${filterType === at.value ? "" : "text-gray-500"}`} />
                <span className={`text-xs font-medium ${filterType === at.value ? "" : "text-gray-500"}`}>{at.label}</span>
                <span className={`text-lg font-bold ${filterType === at.value ? "" : "text-white"}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Add Form */}
        {showForm && (
          <div className={`bg-[#12121a] border ${colors.border} rounded-2xl p-6`}>
            <h3 className={`font-bold mb-4 flex items-center gap-2 ${colors.text}`}>
              <Plus className="w-4 h-4" /> إجراء تأديبي جديد
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Member select or name */}
              <div>
                <label className="text-sm text-gray-400 mb-1 block">اسم العضو <span className="text-red-400">*</span></label>
                <input
                  value={form.memberName}
                  onChange={e => setForm(f => ({ ...f, memberName: e.target.value }))}
                  list="members-list"
                  placeholder="اكتب اسم العضو"
                  className="w-full bg-[#1a1a2e] border border-purple-900/40 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-purple-500"
                />
                <datalist id="members-list">
                  {(members ?? []).map(m => <option key={m.id} value={m.playerName} />)}
                </datalist>
              </div>
              {/* Action type */}
              <div>
                <label className="text-sm text-gray-400 mb-1 block">نوع الإجراء <span className="text-red-400">*</span></label>
                <select
                  value={form.actionType}
                  onChange={e => setForm(f => ({ ...f, actionType: e.target.value }))}
                  className="w-full bg-[#1a1a2e] border border-purple-900/40 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  {ACTION_TYPES.map(at => <option key={at.value} value={at.value}>{at.label}</option>)}
                </select>
              </div>
              {/* Reason */}
              <div className="sm:col-span-2">
                <label className="text-sm text-gray-400 mb-1 block">السبب <span className="text-red-400">*</span></label>
                <textarea
                  value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="اشرح سبب الإجراء..."
                  rows={3}
                  className="w-full bg-[#1a1a2e] border border-purple-900/40 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
              {/* Notes */}
              <div className="sm:col-span-2">
                <label className="text-sm text-gray-400 mb-1 block">ملاحظات إضافية</label>
                <input
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="ملاحظات (اختياري)"
                  className="w-full bg-[#1a1a2e] border border-purple-900/40 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  if (!form.memberName.trim() || !form.reason.trim()) { toast.error("الاسم والسبب مطلوبان"); return; }
                  createMutation.mutate({
                    gangId,
                    memberName: form.memberName,
                    actionType: form.actionType,
                    reason: form.reason,
                    notes: form.notes || undefined,
                  });
                }}
                disabled={createMutation.isPending}
                className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 text-white px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                تسجيل
              </button>
              <button onClick={() => setShowForm(false)} className="px-5 py-2 rounded-xl text-sm text-gray-400 hover:text-white border border-gray-700 transition-colors">
                إلغاء
              </button>
            </div>
          </div>
        )}

        {/* Actions List */}
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-600">لا توجد إجراءات مسجّلة</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((action: any) => {
              const at = ACTION_TYPES.find(t => t.value === action.actionType) ?? ACTION_TYPES[0];
              const Icon = at.icon;
              return (
                <div key={action.id} className={`bg-[#12121a] border ${at.border} rounded-2xl p-4`}>
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl ${at.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-medium text-sm">{action.memberName}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-lg ${at.color}`}>{at.label}</span>
                      </div>
                      <p className="text-gray-400 text-xs mt-1">{action.reason}</p>
                      {action.notes && <p className="text-gray-600 text-xs mt-0.5">{action.notes}</p>}
                      <p className="text-gray-700 text-xs mt-1">
                        {new Date(action.issuedAt).toLocaleDateString("ar-SA")}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </GangDashboardLayout>
  );
}
