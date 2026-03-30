import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useGangAuth } from "@/contexts/GangAuthContext";
import GangDashboardLayout, { GANG_COLORS, GANG_NAMES } from "@/components/GangDashboardLayout";
import { toast } from "sonner";
import { Loader2, Plus, Megaphone, Trash2, AlertCircle, Info, Zap } from "lucide-react";

const PRIORITY_STYLES: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; border: string }> = {
  normal: { label: "عادي", icon: Info, color: "bg-blue-900/20 text-blue-400", border: "border-blue-800/30" },
  important: { label: "مهم", icon: AlertCircle, color: "bg-amber-900/20 text-amber-400", border: "border-amber-800/30" },
  urgent: { label: "عاجل", icon: Zap, color: "bg-red-900/20 text-red-400", border: "border-red-800/30" },
};

export default function Announcements() {
  const { gangUser, loading, isAuthenticated, isSuperAdmin } = useGangAuth();
  const [, navigate] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", priority: "normal" as "normal" | "important" | "urgent" });

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
  }, [loading, isAuthenticated]);

  const gangId = gangUser?.gangId ?? 1;
  const gangSlug = gangUser?.gangId ? GANG_NAMES[gangUser.gangId]?.slug ?? "nova_blinders" : "nova_blinders";
  const colors = GANG_COLORS[gangSlug];
  const utils = trpc.useUtils();

  const { data: announcements, isLoading } = isSuperAdmin
    ? trpc.superadmin.allAnnouncements.useQuery()
    : trpc.announcements.list.useQuery({ gangId }, { enabled: !!gangUser });

  const createMutation = isSuperAdmin
    ? trpc.superadmin.createGlobalAnnouncement.useMutation({
        onSuccess: () => {
          toast.success("تم نشر الإعلان العام");
          setShowCreate(false);
          setForm({ title: "", content: "", priority: "normal" });
          utils.superadmin.allAnnouncements.invalidate();
        },
        onError: e => toast.error(e.message),
      })
    : trpc.announcements.create.useMutation({
        onSuccess: () => {
          toast.success("تم نشر الإعلان");
          setShowCreate(false);
          setForm({ title: "", content: "", priority: "normal" });
          utils.announcements.list.invalidate();
        },
        onError: e => toast.error(e.message),
      });

  const deleteMutation = trpc.announcements.delete.useMutation({
    onSuccess: () => { toast.success("تم حذف الإعلان"); utils.announcements.list.invalidate(); utils.superadmin.allAnnouncements.invalidate(); },
    onError: e => toast.error(e.message),
  });

  const handleCreate = () => {
    if (isSuperAdmin) {
      (createMutation as ReturnType<typeof trpc.superadmin.createGlobalAnnouncement.useMutation>).mutate(form);
    } else {
      (createMutation as ReturnType<typeof trpc.announcements.create.useMutation>).mutate({ gangId, ...form });
    }
  };

  return (
    <GangDashboardLayout title="الإعلانات">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{isSuperAdmin ? "الإعلانات العامة" : "الإعلانات"}</h2>
            <p className="text-gray-500 text-sm">{announcements?.length ?? 0} إعلان</p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            إعلان جديد
          </button>
        </div>

        {/* Create Form */}
        {showCreate && (
          <div className={`bg-[#12121a] border ${colors.border} rounded-2xl p-6`}>
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-purple-400" />
              {isSuperAdmin ? "إعلان عام لجميع العصابات" : "إعلان جديد"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">عنوان الإعلان *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="عنوان الإعلان"
                  className="w-full bg-[#1a1a2e] border border-purple-900/40 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">الأولوية</label>
                <div className="flex gap-2">
                  {Object.entries(PRIORITY_STYLES).map(([key, val]) => (
                    <button
                      key={key}
                      onClick={() => setForm(f => ({ ...f, priority: key as typeof form.priority }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition-colors ${form.priority === key ? `${val.color} border ${val.border}` : "bg-[#1a1a2e] text-gray-500 hover:text-gray-300"}`}
                    >
                      <val.icon className="w-3.5 h-3.5" />
                      {val.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">محتوى الإعلان *</label>
                <textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="اكتب محتوى الإعلان هنا..."
                  rows={4}
                  className="w-full bg-[#1a1a2e] border border-purple-900/40 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending || !form.title.trim() || !form.content.trim()}
                className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 text-white px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
                نشر الإعلان
              </button>
              <button onClick={() => setShowCreate(false)} className="px-5 py-2 rounded-xl text-sm text-gray-400 border border-gray-700">إلغاء</button>
            </div>
          </div>
        )}

        {/* Announcements List */}
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-purple-500" /></div>
        ) : (
          <div className="space-y-3">
            {announcements?.map(ann => {
              const priorityInfo = PRIORITY_STYLES[ann.priority];
              const PriorityIcon = priorityInfo.icon;
              return (
                <div key={ann.id} className={`bg-[#12121a] border ${priorityInfo.border} rounded-2xl p-5`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <PriorityIcon className={`w-4 h-4 ${priorityInfo.color.split(" ")[1]}`} />
                        <h3 className="text-white font-semibold">{ann.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-lg ${priorityInfo.color}`}>{priorityInfo.label}</span>
                        {!ann.gangId && <span className="text-xs bg-purple-900/30 text-purple-300 px-2 py-0.5 rounded-lg">عام</span>}
                        {ann.gangId && isSuperAdmin && (
                          <span className="text-xs bg-gray-900/50 text-gray-400 px-2 py-0.5 rounded-lg">{GANG_NAMES[ann.gangId]?.display}</span>
                        )}
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed">{ann.content}</p>
                      <p className="text-gray-600 text-xs mt-2">{new Date(ann.createdAt).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}</p>
                    </div>
                    {(isSuperAdmin || ann.gangId === gangId) && (
                      <button
                        onClick={() => { if (confirm("حذف هذا الإعلان؟")) deleteMutation.mutate({ announcementId: ann.id, gangId: ann.gangId ?? gangId }); }}
                        className="p-1.5 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {(!announcements || announcements.length === 0) && (
              <div className="text-center py-12 text-gray-600">لا يوجد إعلانات</div>
            )}
          </div>
        )}
      </div>
    </GangDashboardLayout>
  );
}
