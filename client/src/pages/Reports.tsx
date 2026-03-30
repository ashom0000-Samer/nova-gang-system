import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useGangAuth } from "@/contexts/GangAuthContext";
import GangDashboardLayout, { GANG_COLORS, GANG_NAMES } from "@/components/GangDashboardLayout";
import { toast } from "sonner";
import { Loader2, Plus, FileText, Clock, CheckCircle, XCircle, X } from "lucide-react";

const REPORT_TYPES = [
  { value: "activity", label: "نشاط" },
  { value: "incident", label: "حادثة" },
  { value: "recruitment", label: "توظيف" },
  { value: "other", label: "أخرى" },
];

const STATUS_STYLES: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  pending: { label: "قيد المراجعة", icon: Clock, color: "bg-amber-900/30 text-amber-400" },
  reviewed: { label: "تمت المراجعة", icon: CheckCircle, color: "bg-blue-900/30 text-blue-400" },
  closed: { label: "مغلق", icon: XCircle, color: "bg-gray-900/30 text-gray-400" },
};

export default function Reports() {
  const { gangUser, loading, isAuthenticated, isSuperAdmin } = useGangAuth();
  const [, navigate] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", reportType: "activity" as "activity" | "incident" | "recruitment" | "other" });
  const [activeTab, setActiveTab] = useState<"gang" | "mine">("gang");

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
  }, [loading, isAuthenticated]);

  const gangId = gangUser?.gangId ?? 1;
  const gangSlug = gangUser?.gangId ? GANG_NAMES[gangUser.gangId]?.slug ?? "nova_blinders" : "nova_blinders";
  const colors = GANG_COLORS[gangSlug];
  const utils = trpc.useUtils();

  const { data: gangReports, isLoading: gangLoading } = trpc.reports.list.useQuery({ gangId }, { enabled: !!gangUser && !isSuperAdmin });
  const { data: myReports, isLoading: myLoading } = trpc.reports.myReports.useQuery(undefined, { enabled: !!gangUser });
  const { data: allReports, isLoading: allLoading } = trpc.superadmin.allReports.useQuery(undefined, { enabled: isSuperAdmin });

  const createMutation = trpc.reports.create.useMutation({
    onSuccess: () => {
      toast.success("تم رفع التقرير بنجاح");
      setShowCreate(false);
      setForm({ title: "", content: "", reportType: "activity" });
      utils.reports.list.invalidate();
      utils.reports.myReports.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  const updateStatusMutation = trpc.reports.updateStatus.useMutation({
    onSuccess: () => { toast.success("تم تحديث الحالة"); utils.superadmin.allReports.invalidate(); },
    onError: e => toast.error(e.message),
  });

  const displayReports = isSuperAdmin ? allReports : (activeTab === "gang" ? gangReports : myReports);
  const isLoadingReports = isSuperAdmin ? allLoading : (activeTab === "gang" ? gangLoading : myLoading);

  return (
    <GangDashboardLayout title="التقارير">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{isSuperAdmin ? "جميع التقارير" : "التقارير"}</h2>
            <p className="text-gray-500 text-sm">{displayReports?.length ?? 0} تقرير</p>
          </div>
          {!isSuperAdmin && (
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              رفع تقرير
            </button>
          )}
        </div>

        {/* Tabs (non-superadmin) */}
        {!isSuperAdmin && (
          <div className="flex gap-2">
            {[{ key: "gang", label: "تقارير العصابة" }, { key: "mine", label: "تقاريري" }].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as "gang" | "mine")}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === tab.key ? `${colors.bg} ${colors.text} border ${colors.border}` : "bg-[#1a1a2e] text-gray-400 hover:text-white"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Create Form */}
        {showCreate && (
          <div className={`bg-[#12121a] border ${colors.border} rounded-2xl p-6`}>
            <h3 className="text-white font-bold mb-4">رفع تقرير جديد</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">عنوان التقرير *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="عنوان التقرير"
                  className="w-full bg-[#1a1a2e] border border-purple-900/40 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">نوع التقرير</label>
                <select
                  value={form.reportType}
                  onChange={e => setForm(f => ({ ...f, reportType: e.target.value as typeof form.reportType }))}
                  className="w-full bg-[#1a1a2e] border border-purple-900/40 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  {REPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">محتوى التقرير *</label>
                <textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="اكتب تفاصيل التقرير هنا..."
                  rows={5}
                  className="w-full bg-[#1a1a2e] border border-purple-900/40 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => createMutation.mutate({ gangId, ...form })}
                disabled={createMutation.isPending || !form.title.trim() || !form.content.trim()}
                className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 text-white px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                رفع التقرير
              </button>
              <button onClick={() => setShowCreate(false)} className="px-5 py-2 rounded-xl text-sm text-gray-400 border border-gray-700">إلغاء</button>
            </div>
          </div>
        )}

        {/* Reports List */}
        {isLoadingReports ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-purple-500" /></div>
        ) : (
          <div className="space-y-3">
            {displayReports?.map(report => {
              const statusInfo = STATUS_STYLES[report.status];
              const StatusIcon = statusInfo.icon;
              return (
                <div key={report.id} className="bg-[#12121a] border border-purple-900/20 rounded-2xl p-5 hover:border-purple-800/40 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="text-white font-semibold">{report.title}</h3>
                        <span className="text-xs bg-purple-900/30 text-purple-300 px-2 py-0.5 rounded-lg">
                          {REPORT_TYPES.find(t => t.value === report.reportType)?.label}
                        </span>
                        {isSuperAdmin && report.gangId && (
                          <span className="text-xs bg-gray-900/50 text-gray-400 px-2 py-0.5 rounded-lg">
                            {GANG_NAMES[report.gangId]?.display}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm leading-relaxed line-clamp-3">{report.content}</p>
                      <p className="text-gray-600 text-xs mt-2">{new Date(report.createdAt).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${statusInfo.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusInfo.label}
                      </span>
                      {isSuperAdmin && report.status === "pending" && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => updateStatusMutation.mutate({ reportId: report.id, status: "reviewed" })}
                            className="text-xs bg-blue-900/30 text-blue-400 px-2 py-1 rounded-lg hover:bg-blue-900/50"
                          >
                            مراجعة
                          </button>
                          <button
                            onClick={() => updateStatusMutation.mutate({ reportId: report.id, status: "closed" })}
                            className="text-xs bg-gray-900/50 text-gray-400 px-2 py-1 rounded-lg hover:bg-gray-900/70"
                          >
                            إغلاق
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {(!displayReports || displayReports.length === 0) && (
              <div className="text-center py-12 text-gray-600">لا يوجد تقارير</div>
            )}
          </div>
        )}
      </div>
    </GangDashboardLayout>
  );
}
