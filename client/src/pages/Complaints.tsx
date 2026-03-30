import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useGangAuth } from "@/contexts/GangAuthContext";
import GangDashboardLayout, { GANG_COLORS, GANG_NAMES } from "@/components/GangDashboardLayout";
import { toast } from "sonner";
import { Loader2, Plus, MessageSquareWarning, CheckCircle2, XCircle, Clock, Eye } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending:  { label: "قيد المراجعة", color: "text-amber-400 bg-amber-900/20",  icon: Clock },
  reviewed: { label: "تمت المراجعة", color: "text-blue-400 bg-blue-900/20",    icon: Eye },
  resolved: { label: "تم الحل",      color: "text-green-400 bg-green-900/20",  icon: CheckCircle2 },
  rejected: { label: "مرفوضة",       color: "text-red-400 bg-red-900/20",      icon: XCircle },
};

export default function Complaints() {
  const { gangUser, loading, isAuthenticated } = useGangAuth();
  const [, navigate] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", content: "" });
  const [selected, setSelected] = useState<any>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewStatus, setReviewStatus] = useState<"reviewed" | "resolved" | "rejected">("resolved");

  useEffect(() => { if (!loading && !isAuthenticated) navigate("/"); }, [loading, isAuthenticated]);

  const gangId = gangUser?.gangId ?? 1;
  const gangSlug = gangUser?.gangId ? GANG_NAMES[gangUser.gangId]?.slug ?? "nova_blinders" : "nova_blinders";
  const colors = GANG_COLORS[gangSlug];
  const isSuperAdmin = gangUser?.role === "superadmin";
  const utils = trpc.useUtils();

  const { data: complaints, isLoading } = trpc.complaints.list.useQuery({ gangId }, { enabled: !!gangUser && !isSuperAdmin });
  const { data: allComplaints, isLoading: allLoading } = trpc.complaints.all.useQuery(undefined, { enabled: !!gangUser && isSuperAdmin });

  const submitMutation = trpc.complaints.submit.useMutation({
    onSuccess: () => {
      toast.success("تم رفع الشكوى بنجاح");
      setForm({ title: "", content: "" });
      setShowForm(false);
      utils.complaints.list.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  const reviewMutation = trpc.complaints.review.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة الشكوى");
      setSelected(null);
      utils.complaints.list.invalidate();
      utils.complaints.all.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  const displayList = isSuperAdmin ? (allComplaints ?? []) : (complaints ?? []);
  const isLoadingList = isSuperAdmin ? allLoading : isLoading;

  return (
    <GangDashboardLayout title="الشكاوى">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">الشكاوى</h2>
            <p className="text-gray-500 text-sm">
              {isSuperAdmin ? "جميع الشكاوى من العصابات الثلاث" : "رفع ومتابعة الشكاوى"}
            </p>
          </div>
          {!isSuperAdmin && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              رفع شكوى جديدة
            </button>
          )}
        </div>

        {/* Submit Form */}
        {showForm && !isSuperAdmin && (
          <div className={`bg-[#12121a] border ${colors.border} rounded-2xl p-6`}>
            <h3 className={`font-bold mb-4 flex items-center gap-2 ${colors.text}`}>
              <MessageSquareWarning className="w-4 h-4" /> رفع شكوى جديدة
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">عنوان الشكوى <span className="text-red-400">*</span></label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="عنوان مختصر للشكوى"
                  className="w-full bg-[#1a1a2e] border border-purple-900/40 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">تفاصيل الشكوى <span className="text-red-400">*</span></label>
                <textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="اشرح الشكوى بالتفصيل..."
                  rows={4}
                  className="w-full bg-[#1a1a2e] border border-purple-900/40 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  if (!form.title.trim() || !form.content.trim()) { toast.error("العنوان والتفاصيل مطلوبان"); return; }
                  submitMutation.mutate({ gangId, title: form.title, content: form.content });
                }}
                disabled={submitMutation.isPending}
                className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 text-white px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                رفع الشكوى
              </button>
              <button onClick={() => setShowForm(false)} className="px-5 py-2 rounded-xl text-sm text-gray-400 hover:text-white border border-gray-700 transition-colors">
                إلغاء
              </button>
            </div>
          </div>
        )}

        {/* Review Modal */}
        {selected && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#12121a] border border-purple-700/40 rounded-2xl p-6 w-full max-w-lg">
              <h3 className="text-white font-bold mb-1">{selected.title}</h3>
              <p className="text-gray-500 text-xs mb-3">من: {selected.submitterName}</p>
              <p className="text-gray-300 text-sm mb-4 bg-[#1a1a2e] rounded-xl p-3">{selected.content}</p>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">الإجراء</label>
                  <select
                    value={reviewStatus}
                    onChange={e => setReviewStatus(e.target.value as any)}
                    className="w-full bg-[#1a1a2e] border border-purple-900/40 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-purple-500"
                  >
                    <option value="reviewed">تمت المراجعة</option>
                    <option value="resolved">تم الحل</option>
                    <option value="rejected">رفض الشكوى</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">ملاحظة الرد (اختياري)</label>
                  <textarea
                    value={reviewNote}
                    onChange={e => setReviewNote(e.target.value)}
                    rows={2}
                    className="w-full bg-[#1a1a2e] border border-purple-900/40 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => reviewMutation.mutate({ complaintId: selected.id, gangId: selected.gangId, status: reviewStatus, reviewNote: reviewNote || undefined })}
                  disabled={reviewMutation.isPending}
                  className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 text-white px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {reviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  تأكيد
                </button>
                <button onClick={() => { setSelected(null); setReviewNote(""); }} className="px-5 py-2 rounded-xl text-sm text-gray-400 hover:text-white border border-gray-700 transition-colors">
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Complaints List */}
        {isLoadingList ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>
        ) : displayList.length === 0 ? (
          <div className="text-center py-16 text-gray-600">لا توجد شكاوى بعد</div>
        ) : (
          <div className="space-y-3">
            {displayList.map((c: any) => {
              const s = STATUS_MAP[c.status] ?? STATUS_MAP.pending;
              const Icon = s.icon;
              return (
                <div key={c.id} className="bg-[#12121a] border border-purple-900/20 rounded-2xl p-4 hover:border-purple-700/40 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-lg flex items-center gap-1 ${s.color}`}>
                          <Icon className="w-3 h-3" /> {s.label}
                        </span>
                        {isSuperAdmin && c.gangId && (
                          <span className="text-xs text-gray-600">
                            {GANG_NAMES[c.gangId]?.display ?? `عصابة ${c.gangId}`}
                          </span>
                        )}
                      </div>
                      <h4 className="text-white font-medium text-sm">{c.title}</h4>
                      <p className="text-gray-500 text-xs mt-0.5">من: {c.submitterName}</p>
                      <p className="text-gray-400 text-xs mt-1 line-clamp-2">{c.content}</p>
                      {c.reviewNote && (
                        <p className="text-blue-400 text-xs mt-1 bg-blue-900/10 rounded-lg px-2 py-1">رد: {c.reviewNote}</p>
                      )}
                    </div>
                    {(isSuperAdmin || gangUser?.role === "gang_admin") && c.status === "pending" && (
                      <button
                        onClick={() => { setSelected(c); setReviewNote(""); setReviewStatus("resolved"); }}
                        className="shrink-0 text-xs bg-purple-900/30 hover:bg-purple-700/40 text-purple-300 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        مراجعة
                      </button>
                    )}
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
