import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useGangAuth } from "@/contexts/GangAuthContext";
import GangDashboardLayout, { GANG_COLORS, GANG_NAMES } from "@/components/GangDashboardLayout";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Building2, ChevronDown, ChevronUp } from "lucide-react";

// الأقسام من الصورة
const PRESET_DEPARTMENTS = [
  { name: "مسؤول السجل الإجرامي",    minRank: "𝐆𝐀𝐍𝐆 𝐁𝐎𝐒𝐒 ✯",      maxRank: "𝐆𝐀𝐍𝐆 𝐂𝐨𝐦𝐦𝐚𝐧𝐝𝐞𝐫 ♔" },
  { name: "مسؤول الإجازات",           minRank: "𝐆𝐀𝐍𝐆 𝐂𝐑𝐈𝐌𝐈𝐍𝐀𝐋",      maxRank: "𝐆𝐀𝐍𝐆 𝐂𝐨𝐦𝐦𝐚𝐧𝐝𝐞𝐫 ♔" },
  { name: "مسؤول الجرد",              minRank: "𝐆𝐀𝐍𝐆 𝐂𝐑𝐈𝐌𝐈𝐍𝐀𝐋",      maxRank: "𝐆𝐀𝐍𝐆 𝐂𝐨𝐦𝐦𝐚𝐧𝐝𝐞𝐫 ♔" },
  { name: "مسؤول التشريفات",          minRank: "𝐆𝐀𝐍𝐆 𝐁𝐎𝐒𝐒 ✯",      maxRank: "𝐆𝐀𝐍𝐆 𝐌𝐀𝐍𝐀𝐆𝐄𝐑 ✯" },
  { name: "مسؤول الصف",               minRank: "𝐆𝐚𝐧𝐠 𝐊𝐢𝐥𝐥𝐞𝐫",       maxRank: "𝐆𝐀𝐍𝐆 𝐌𝐀𝐍𝐀𝐆𝐄𝐑 ✯" },
  { name: "مسؤول التحذيرات",          minRank: "𝐆𝐀𝐍𝐆 𝐂𝐑𝐈𝐌𝐈𝐍𝐀𝐋",      maxRank: "𝐆𝐀𝐍𝐆 𝐂𝐨𝐦𝐦𝐚𝐧𝐝𝐞𝐫 ♔" },
  { name: "مسؤول الترقيات",           minRank: "𝐆𝐀𝐍𝐆 𝐂𝐑𝐈𝐌𝐈𝐍𝐀𝐋",      maxRank: "𝐆𝐀𝐍𝐆 𝐂𝐨𝐦𝐦𝐚𝐧𝐝𝐞𝐫 ♔" },
  { name: "مسؤول الاستقالات",         minRank: "𝐆𝐀𝐍𝐆 𝐂𝐑𝐈𝐌𝐈𝐍𝐀𝐋",      maxRank: "𝐆𝐀𝐍𝐆 𝐋𝐄𝐀𝐃𝐄𝐑 ♔" },
];

const ALL_RANKS = [
  { group: "── المسؤولون ──", ranks: ["𝐆𝐀𝐍𝐆 𝐋𝐄𝐀𝐃𝐄𝐑 ♔", "𝐆𝐀𝐍𝐆 𝐂𝐎 𝐋𝐄𝐀𝐃𝐄𝐑 ♔", "𝐆𝐀𝐍𝐆 𝐂𝐄𝐎 ♔", "𝐆𝐀𝐍𝐆 𝐂𝐨𝐦𝐦𝐚𝐧𝐝𝐞𝐫 ♔"] },
  { group: "── الأعضاء ──",   ranks: ["𝐆𝐀𝐍𝐆 𝐁𝐎𝐒𝐒 ✯", "𝐆𝐀𝐍𝐆 𝐌𝐀𝐍𝐀𝐆𝐄𝐑 ✯", "𝐆𝐀𝐍𝐆 𝐀𝐃𝐕𝐈𝐒𝐎𝐑", "𝐆𝐀𝐍𝐆 𝐂𝐑𝐈𝐌𝐈𝐍𝐀𝐋", "𝐆𝐚𝐧𝐠 𝐊𝐢𝐥𝐥𝐞𝐫"] },
  { group: "── المشرفون ──",  ranks: ["🏴〡𝐒𝐈𝐋𝐄𝐍𝐓 𝐇𝐀𝐍𝐃", "➥♕  𝐁𝐈𝐆 𝐁𝐎𝐒𝐒"] },
];

export default function Departments() {
  const { gangUser, loading, isAuthenticated } = useGangAuth();
  const [, navigate] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", minRank: "", maxRank: "" });

  useEffect(() => { if (!loading && !isAuthenticated) navigate("/"); }, [loading, isAuthenticated]);

  const gangId = gangUser?.gangId ?? 1;
  const gangSlug = gangUser?.gangId ? GANG_NAMES[gangUser.gangId]?.slug ?? "nova_blinders" : "nova_blinders";
  const colors = GANG_COLORS[gangSlug];
  const utils = trpc.useUtils();

  const { data: departments, isLoading } = trpc.departments.list.useQuery({ gangId }, { enabled: !!gangUser });

  const createMutation = trpc.departments.create.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء القسم بنجاح");
      setForm({ name: "", description: "", minRank: "", maxRank: "" });
      setShowForm(false);
      utils.departments.list.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  const deleteMutation = trpc.departments.delete.useMutation({
    onSuccess: () => { toast.success("تم حذف القسم"); utils.departments.list.invalidate(); },
    onError: e => toast.error(e.message),
  });

  const addPreset = (preset: typeof PRESET_DEPARTMENTS[0]) => {
    createMutation.mutate({ gangId, name: preset.name, minRank: preset.minRank, maxRank: preset.maxRank });
  };

  return (
    <GangDashboardLayout title="الأقسام">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">الأقسام الوظيفية</h2>
            <p className="text-gray-500 text-sm">إدارة أقسام العصابة وصلاحياتها</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="flex items-center gap-2 bg-[#1a1a2e] hover:bg-purple-900/20 text-gray-300 px-4 py-2 rounded-xl text-sm font-medium transition-colors border border-purple-900/30"
            >
              {showPresets ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              أقسام جاهزة
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              قسم جديد
            </button>
          </div>
        </div>

        {/* Preset Departments */}
        {showPresets && (
          <div className="bg-[#12121a] border border-purple-900/20 rounded-2xl p-4">
            <h3 className="text-gray-400 text-sm font-medium mb-3">الأقسام الجاهزة (من الصلاحيات القياسية)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_DEPARTMENTS.map((p, i) => (
                <div key={i} className="flex items-center justify-between bg-[#1a1a2e] rounded-xl px-3 py-2.5">
                  <div>
                    <p className="text-white text-sm">{p.name}</p>
                    <p className="text-gray-600 text-xs">{p.minRank} ← {p.maxRank}</p>
                  </div>
                  <button
                    onClick={() => addPreset(p)}
                    disabled={createMutation.isPending}
                    className="text-xs bg-purple-900/30 hover:bg-purple-700/40 text-purple-300 px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                  >
                    إضافة
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Custom Form */}
        {showForm && (
          <div className={`bg-[#12121a] border ${colors.border} rounded-2xl p-6`}>
            <h3 className={`font-bold mb-4 flex items-center gap-2 ${colors.text}`}>
              <Building2 className="w-4 h-4" /> إنشاء قسم جديد
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-sm text-gray-400 mb-1 block">اسم القسم <span className="text-red-400">*</span></label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="مثال: مسؤول السجل الإجرامي"
                  className="w-full bg-[#1a1a2e] border border-purple-900/40 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">أدنى رتبة مطلوبة</label>
                <select
                  value={form.minRank}
                  onChange={e => setForm(f => ({ ...f, minRank: e.target.value }))}
                  className="w-full bg-[#1a1a2e] border border-purple-900/40 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="">-- لا يوجد حد أدنى --</option>
                  {ALL_RANKS.map(g => (
                    <optgroup key={g.group} label={g.group}>
                      {g.ranks.map(r => <option key={r} value={r}>{r}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">أعلى رتبة مسموحة</label>
                <select
                  value={form.maxRank}
                  onChange={e => setForm(f => ({ ...f, maxRank: e.target.value }))}
                  className="w-full bg-[#1a1a2e] border border-purple-900/40 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="">-- لا يوجد حد أعلى --</option>
                  {ALL_RANKS.map(g => (
                    <optgroup key={g.group} label={g.group}>
                      {g.ranks.map(r => <option key={r} value={r}>{r}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm text-gray-400 mb-1 block">وصف القسم</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="وصف مختصر لمهام القسم (اختياري)"
                  rows={2}
                  className="w-full bg-[#1a1a2e] border border-purple-900/40 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  if (!form.name.trim()) { toast.error("اسم القسم مطلوب"); return; }
                  createMutation.mutate({ gangId, name: form.name, description: form.description || undefined, minRank: form.minRank || undefined, maxRank: form.maxRank || undefined });
                }}
                disabled={createMutation.isPending}
                className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 text-white px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                إنشاء
              </button>
              <button onClick={() => setShowForm(false)} className="px-5 py-2 rounded-xl text-sm text-gray-400 hover:text-white border border-gray-700 transition-colors">
                إلغاء
              </button>
            </div>
          </div>
        )}

        {/* Departments Grid */}
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>
        ) : (departments ?? []).length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
            لا توجد أقسام بعد — أضف قسماً جديداً أو اختر من الأقسام الجاهزة
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(departments ?? []).map((dept: any) => (
              <div key={dept.id} className={`bg-[#12121a] border ${colors.border} rounded-2xl p-4 hover:border-purple-700/50 transition-colors`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl ${colors.bg} mt-0.5`}>
                      <Building2 className={`w-4 h-4 ${colors.text}`} />
                    </div>
                    <div>
                      <h4 className="text-white font-medium text-sm">{dept.name}</h4>
                      {dept.description && <p className="text-gray-500 text-xs mt-0.5">{dept.description}</p>}
                      {(dept.minRank || dept.maxRank) && (
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {dept.minRank && <span className="text-xs bg-purple-900/20 text-purple-400 px-2 py-0.5 rounded-lg">من: {dept.minRank}</span>}
                          {dept.maxRank && <span className="text-xs bg-purple-900/20 text-purple-400 px-2 py-0.5 rounded-lg">حتى: {dept.maxRank}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => { if (confirm(`حذف قسم "${dept.name}"؟`)) deleteMutation.mutate({ departmentId: dept.id, gangId }); }}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-900/20 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </GangDashboardLayout>
  );
}
