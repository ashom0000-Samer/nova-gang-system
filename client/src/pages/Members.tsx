import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useGangAuth } from "@/contexts/GangAuthContext";
import GangDashboardLayout, { GANG_COLORS, GANG_NAMES } from "@/components/GangDashboardLayout";
import { toast } from "sonner";
import { Loader2, Search, AlertTriangle, TrendingUp, UserX, CheckCircle, ChevronDown, X } from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "نشط", color: "bg-green-900/30 text-green-400" },
  warned: { label: "محذّر", color: "bg-amber-900/30 text-amber-400" },
  suspended: { label: "موقوف", color: "bg-orange-900/30 text-orange-400" },
  fired: { label: "مفصول", color: "bg-red-900/30 text-red-400" },
};

const RANKS = ["عضو", "عضو أول", "نقيب", "رقيب", "ملازم", "نائب قائد", "قائد"];

export default function Members() {
  const { gangUser, loading, isAuthenticated } = useGangAuth();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<number | null>(null);
  const [warnReason, setWarnReason] = useState("");
  const [promoteRank, setPromoteRank] = useState("");
  const [showWarnModal, setShowWarnModal] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [showWarningsModal, setShowWarningsModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
  }, [loading, isAuthenticated]);

  const gangId = gangUser?.gangId ?? 1;
  const gangSlug = gangUser?.gangId ? GANG_NAMES[gangUser.gangId]?.slug ?? "nova_blinders" : "nova_blinders";
  const colors = GANG_COLORS[gangSlug];
  const utils = trpc.useUtils();

  const { data: members, isLoading } = trpc.members.list.useQuery({ gangId }, { enabled: !!gangUser });
  const { data: memberWarnings } = trpc.members.warnings.useQuery(
    { memberId: selectedMember!, gangId },
    { enabled: !!selectedMember && showWarningsModal }
  );

  const warnMutation = trpc.members.warn.useMutation({
    onSuccess: () => { toast.success("تم إصدار التحذير"); setShowWarnModal(false); setWarnReason(""); utils.members.list.invalidate(); },
    onError: e => toast.error(e.message),
  });

  const promoteMutation = trpc.members.promote.useMutation({
    onSuccess: () => { toast.success("تم الترقية بنجاح"); setShowPromoteModal(false); utils.members.list.invalidate(); },
    onError: e => toast.error(e.message),
  });

  const statusMutation = trpc.members.updateStatus.useMutation({
    onSuccess: () => { toast.success("تم تحديث الحالة"); utils.members.list.invalidate(); },
    onError: e => toast.error(e.message),
  });

  const filtered = members?.filter(m => {
    const matchSearch = m.playerName.toLowerCase().includes(search.toLowerCase()) || (m.playerId?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchStatus = filterStatus === "all" || m.status === filterStatus;
    return matchSearch && matchStatus;
  }) ?? [];

  if (loading || isLoading) return (
    <GangDashboardLayout title="قائمة الأعضاء">
      <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>
    </GangDashboardLayout>
  );

  return (
    <GangDashboardLayout title="قائمة الأعضاء">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">قائمة الأعضاء</h2>
            <p className="text-gray-500 text-sm">{filtered.length} عضو</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {["all", "active", "warned", "suspended", "fired"].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === s ? `${colors.bg} ${colors.text} border ${colors.border}` : "bg-[#1a1a2e] text-gray-400 hover:text-white"}`}
              >
                {s === "all" ? "الكل" : STATUS_LABELS[s]?.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث باسم اللاعب أو الـ ID..."
            className="w-full bg-[#12121a] border border-purple-900/20 rounded-xl py-2.5 pr-10 pl-4 text-white text-sm focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Members Table */}
        <div className="bg-[#12121a] border border-purple-900/20 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-purple-900/20">
                  <th className="text-right text-xs text-gray-500 font-medium px-5 py-3">اللاعب</th>
                  <th className="text-right text-xs text-gray-500 font-medium px-5 py-3">الرتبة</th>
                  <th className="text-right text-xs text-gray-500 font-medium px-5 py-3">الحالة</th>
                  <th className="text-right text-xs text-gray-500 font-medium px-5 py-3">التحذيرات</th>
                  <th className="text-right text-xs text-gray-500 font-medium px-5 py-3">تاريخ الانضمام</th>
                  <th className="text-right text-xs text-gray-500 font-medium px-5 py-3">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(member => (
                  <tr key={member.id} className="border-b border-purple-900/10 hover:bg-purple-900/5 transition-colors">
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-white text-sm font-medium">{member.playerName}</p>
                        {member.playerId && <p className="text-gray-500 text-xs">ID: {member.playerId}</p>}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2 py-1 rounded-lg ${colors.bg} ${colors.text} border ${colors.border}`}>
                        {member.rank}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2 py-1 rounded-lg ${STATUS_LABELS[member.status]?.color}`}>
                        {STATUS_LABELS[member.status]?.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => { setSelectedMember(member.id); setShowWarningsModal(true); }}
                        className={`text-sm font-bold ${member.warningCount > 0 ? "text-amber-400 hover:text-amber-300" : "text-gray-500"}`}
                      >
                        {member.warningCount} ⚠️
                      </button>
                    </td>
                    <td className="px-5 py-4 text-gray-400 text-xs">
                      {new Date(member.joinedAt).toLocaleDateString("ar-SA")}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        {/* Warn */}
                        <button
                          onClick={() => { setSelectedMember(member.id); setShowWarnModal(true); }}
                          className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-900/20 transition-colors"
                          title="تحذير"
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </button>
                        {/* Promote */}
                        <button
                          onClick={() => { setSelectedMember(member.id); setPromoteRank(member.rank); setShowPromoteModal(true); }}
                          className="p-1.5 rounded-lg text-green-400 hover:bg-green-900/20 transition-colors"
                          title="ترقية"
                        >
                          <TrendingUp className="w-4 h-4" />
                        </button>
                        {/* Activate */}
                        {member.status !== "active" && (
                          <button
                            onClick={() => statusMutation.mutate({ memberId: member.id, gangId, status: "active" })}
                            className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-900/20 transition-colors"
                            title="تفعيل"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {/* Suspend */}
                        {member.status === "active" && (
                          <button
                            onClick={() => { if (confirm("تعليق هذا العضو؟")) statusMutation.mutate({ memberId: member.id, gangId, status: "suspended" }); }}
                            className="p-1.5 rounded-lg text-orange-400 hover:bg-orange-900/20 transition-colors"
                            title="تعليق"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        )}
                        {/* Fire */}
                        <button
                          onClick={() => { if (confirm("فصل هذا العضو نهائياً؟")) statusMutation.mutate({ memberId: member.id, gangId, status: "fired" }); }}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-900/20 transition-colors"
                          title="فصل"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-600">لا يوجد أعضاء</div>
            )}
          </div>
        </div>
      </div>

      {/* Warn Modal */}
      {showWarnModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" dir="rtl">
          <div className="bg-[#12121a] border border-amber-700/40 rounded-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-400" /> إصدار تحذير</h3>
            <textarea
              value={warnReason}
              onChange={e => setWarnReason(e.target.value)}
              placeholder="سبب التحذير..."
              rows={3}
              className="w-full bg-[#1a1a2e] border border-amber-900/40 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-amber-500 mb-4 resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => warnMutation.mutate({ memberId: selectedMember!, gangId, reason: warnReason })}
                disabled={warnMutation.isPending || !warnReason.trim()}
                className="flex-1 bg-amber-700 hover:bg-amber-600 text-white py-2 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {warnMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "تحذير"}
              </button>
              <button onClick={() => setShowWarnModal(false)} className="flex-1 border border-gray-700 text-gray-400 py-2 rounded-xl text-sm">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Promote Modal */}
      {showPromoteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" dir="rtl">
          <div className="bg-[#12121a] border border-green-700/40 rounded-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-green-400" /> ترقية عضو</h3>
            <select
              value={promoteRank}
              onChange={e => setPromoteRank(e.target.value)}
              className="w-full bg-[#1a1a2e] border border-green-900/40 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-green-500 mb-4"
            >
              {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => promoteMutation.mutate({ memberId: selectedMember!, gangId, rank: promoteRank })}
                disabled={promoteMutation.isPending}
                className="flex-1 bg-green-700 hover:bg-green-600 text-white py-2 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {promoteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "ترقية"}
              </button>
              <button onClick={() => setShowPromoteModal(false)} className="flex-1 border border-gray-700 text-gray-400 py-2 rounded-xl text-sm">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Warnings History Modal */}
      {showWarningsModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" dir="rtl">
          <div className="bg-[#12121a] border border-amber-700/40 rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">سجل التحذيرات</h3>
              <button onClick={() => setShowWarningsModal(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {memberWarnings?.map(w => (
                <div key={w.id} className="bg-amber-900/10 border border-amber-900/30 rounded-xl p-3">
                  <p className="text-white text-sm">{w.reason}</p>
                  <p className="text-gray-500 text-xs mt-1">{new Date(w.issuedAt).toLocaleDateString("ar-SA")}</p>
                </div>
              ))}
              {(!memberWarnings || memberWarnings.length === 0) && (
                <p className="text-gray-600 text-center py-4">لا يوجد تحذيرات</p>
              )}
            </div>
          </div>
        </div>
      )}
    </GangDashboardLayout>
  );
}
