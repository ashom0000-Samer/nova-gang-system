import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useGangAuth } from "@/contexts/GangAuthContext";
import GangDashboardLayout, { GANG_COLORS, GANG_NAMES } from "@/components/GangDashboardLayout";
import { toast } from "sonner";
import { Loader2, UserPlus, Trash2, Search, Copy, Plus } from "lucide-react";

const ALL_RANKS = [
  { group: "── المسؤولون ──", ranks: ["𝐆𝐀𝐍𝐆 𝐋𝐄𝐀𝐃𝐄𝐑 ♔", "𝐆𝐀𝐍𝐆 𝐂𝐎 𝐋𝐄𝐀𝐃𝐄𝐑 ♔", "𝐆𝐀𝐍𝐆 𝐂𝐄𝐎 ♔", "𝐆𝐀𝐍𝐆 𝐂𝐨𝐦𝐦𝐚𝐧𝐝𝐞𝐫 ♔"] },
  { group: "── الأعضاء ──", ranks: ["𝐆𝐀𝐍𝐆 𝐁𝐎𝐒𝐒 ✯", "𝐆𝐀𝐍𝐆 𝐌𝐀𝐍𝐀𝐆𝐄𝐑 ✯", "𝐆𝐀𝐍𝐆 𝐀𝐃𝐕𝐈𝐒𝐎𝐑", "𝐆𝐀𝐍𝐆 𝐂𝐑𝐈𝐌𝐈𝐍𝐀𝐋", "𝐆𝐚𝐧𝐠 𝐊𝐢𝐥𝐥𝐞𝐫"] },
  { group: "── المشرفون ──", ranks: ["🏴〡𝐒𝐈𝐋𝐄𝐍𝐓 𝐇𝐀𝐍𝐃", "➥♕  𝐁𝐈𝐆 𝐁𝐎𝐒𝐒"] },
];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-900/30 text-green-400",
  warned: "bg-amber-900/30 text-amber-400",
  suspended: "bg-orange-900/30 text-orange-400",
  fired: "bg-red-900/30 text-red-400",
};
const STATUS_LABELS: Record<string, string> = {
  active: "نشط", warned: "محذّر", suspended: "موقوف", fired: "مفصول",
};

export default function Recruitment() {
  const { gangUser, loading, isAuthenticated } = useGangAuth();
  const [, navigate] = useLocation();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ playerName: "", playerId: "", playerUsername: "", rank: "", notes: "" });
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
  }, [loading, isAuthenticated]);

  const gangId = gangUser?.gangId ?? 1;
  const gangSlug = gangUser?.gangId ? GANG_NAMES[gangUser.gangId]?.slug ?? "nova_blinders" : "nova_blinders";
  const colors = GANG_COLORS[gangSlug];
  const gangInfo = gangUser?.gangId ? GANG_NAMES[gangUser.gangId] : null;
  const utils = trpc.useUtils();

  const { data: members, isLoading } = trpc.members.list.useQuery({ gangId }, { enabled: !!gangUser });

  const addMutation = trpc.members.add.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة العضو بنجاح");
      setForm({ playerName: "", playerId: "", playerUsername: "", rank: "", notes: "" });
      setShowAdd(false);
      utils.members.list.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  const removeMutation = trpc.members.remove.useMutation({
    onSuccess: () => { toast.success("تم حذف العضو"); utils.members.list.invalidate(); },
    onError: e => toast.error(e.message),
  });

  const filtered = useMemo(() =>
    (members ?? []).filter(m =>
      m.playerName.toLowerCase().includes(search.toLowerCase()) ||
      (m.playerId?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      m.rank.toLowerCase().includes(search.toLowerCase())
    ), [members, search]);

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم النسخ!");
  };

  return (
    <GangDashboardLayout title="قائمة التوظيف">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">قائمة التوظيف</h2>
            <p className="text-gray-500 text-sm">
              {gangInfo ? <span className={colors.text}>{gangInfo.display}</span> : "جميع العصابات"}
              {" — "}{members?.length ?? 0} عضو
            </p>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            إضافة عضو جديد
          </button>
        </div>

        {/* Add Form */}
        {showAdd && (
          <div className={`bg-[#12121a] border ${colors.border} rounded-2xl p-6`}>
            <h3 className={`font-bold mb-4 flex items-center gap-2 ${colors.text}`}>
              <Plus className="w-4 h-4" /> إضافة عضو جديد
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label className="text-sm text-gray-400 mb-1 block">الاسم الكامل <span className="text-red-400">*</span></label>
                <input
                  value={form.playerName}
                  onChange={e => setForm(f => ({ ...f, playerName: e.target.value }))}
                  placeholder="اسم اللاعب"
                  className="w-full bg-[#1a1a2e] border border-purple-900/40 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              {/* Username */}
              <div>
                <label className="text-sm text-gray-400 mb-1 block">اليوزر (Username)</label>
                <div className="relative">
                  <input
                    value={form.playerUsername}
                    onChange={e => setForm(f => ({ ...f, playerUsername: e.target.value }))}
                    placeholder="@username"
                    className="w-full bg-[#1a1a2e] border border-purple-900/40 rounded-xl py-2.5 px-4 pr-9 text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                  {form.playerUsername && (
                    <button type="button" onClick={() => copyText(form.playerUsername)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-purple-400">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {/* ID */}
              <div>
                <label className="text-sm text-gray-400 mb-1 block">الآيدي (ID)</label>
                <div className="relative">
                  <input
                    value={form.playerId}
                    onChange={e => setForm(f => ({ ...f, playerId: e.target.value }))}
                    placeholder="رقم الآيدي"
                    className="w-full bg-[#1a1a2e] border border-purple-900/40 rounded-xl py-2.5 px-4 pr-9 text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                  {form.playerId && (
                    <button type="button" onClick={() => copyText(form.playerId)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-purple-400">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {/* Rank */}
              <div>
                <label className="text-sm text-gray-400 mb-1 block">الرتبة <span className="text-red-400">*</span></label>
                <select
                  value={form.rank}
                  onChange={e => setForm(f => ({ ...f, rank: e.target.value }))}
                  className="w-full bg-[#1a1a2e] border border-purple-900/40 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="">-- اختر الرتبة --</option>
                  {ALL_RANKS.map(g => (
                    <optgroup key={g.group} label={g.group}>
                      {g.ranks.map(r => <option key={r} value={r}>{r}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              {/* Notes */}
              <div className="sm:col-span-2">
                <label className="text-sm text-gray-400 mb-1 block">ملاحظات</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="ملاحظات إضافية (اختياري)"
                  rows={2}
                  className="w-full bg-[#1a1a2e] border border-purple-900/40 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  if (!form.playerName.trim()) { toast.error("الاسم مطلوب"); return; }
                  if (!form.rank) { toast.error("الرتبة مطلوبة"); return; }
                  addMutation.mutate({ gangId, playerName: form.playerName, playerId: form.playerId || undefined, rank: form.rank, notes: form.notes || undefined });
                }}
                disabled={addMutation.isPending}
                className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                إضافة
              </button>
              <button onClick={() => setShowAdd(false)} className="px-5 py-2 rounded-xl text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 transition-colors">
                إلغاء
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الآيدي أو الرتبة..."
            className="w-full bg-[#12121a] border border-purple-900/20 rounded-xl py-2.5 pr-10 pl-4 text-white text-sm focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Members Table */}
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>
        ) : (
          <div className="bg-[#12121a] border border-purple-900/20 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-purple-900/20">
                    <th className="text-right text-xs text-gray-500 font-medium px-4 py-3">#</th>
                    <th className="text-right text-xs text-gray-500 font-medium px-4 py-3">الاسم</th>
                    <th className="text-right text-xs text-gray-500 font-medium px-4 py-3">اليوزر</th>
                    <th className="text-right text-xs text-gray-500 font-medium px-4 py-3">الآيدي</th>
                    <th className="text-right text-xs text-gray-500 font-medium px-4 py-3">الرتبة</th>
                    <th className="text-right text-xs text-gray-500 font-medium px-4 py-3">الحالة</th>
                    <th className="text-right text-xs text-gray-500 font-medium px-4 py-3">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((member, idx) => (
                    <tr key={member.id} className="border-b border-purple-900/10 hover:bg-purple-900/5 transition-colors">
                      <td className="px-4 py-3 text-gray-600 text-xs">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full ${colors.bg} flex items-center justify-center ${colors.text} text-xs font-bold border ${colors.border}`}>
                            {member.playerName[0]}
                          </div>
                          <span className="text-white text-sm font-medium">{member.playerName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400 text-xs">{(member as any).playerUsername || "—"}</span>
                          {(member as any).playerUsername && (
                            <button onClick={() => copyText((member as any).playerUsername)} className="text-gray-600 hover:text-purple-400">
                              <Copy className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400 text-xs font-mono">{member.playerId || "—"}</span>
                          {member.playerId && (
                            <button onClick={() => copyText(member.playerId!)} className="text-gray-600 hover:text-purple-400">
                              <Copy className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-amber-300 font-medium">{member.rank}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-lg ${STATUS_COLORS[member.status] ?? "bg-gray-800 text-gray-400"}`}>
                          {STATUS_LABELS[member.status] ?? member.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => { if (confirm(`هل تريد حذف ${member.playerName}؟`)) removeMutation.mutate({ memberId: member.id, gangId }); }}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-900/20 transition-colors"
                          title="حذف العضو"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-12 text-gray-600">
                  {search ? "لا توجد نتائج للبحث" : "لا يوجد أعضاء بعد — أضف عضواً جديداً"}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </GangDashboardLayout>
  );
}
