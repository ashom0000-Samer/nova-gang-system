import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useGangAuth } from "@/contexts/GangAuthContext";
import GangDashboardLayout from "@/components/GangDashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, ClipboardList, CheckCircle, XCircle, Clock, Copy, ExternalLink } from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:  { label: "قيد الانتظار", color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
  passed:   { label: "اجتاز الاختبار", color: "bg-green-500/20 text-green-300 border-green-500/30" },
  failed:   { label: "رسب في الاختبار", color: "bg-red-500/20 text-red-300 border-red-500/30" },
  accepted: { label: "مقبول في العصابة", color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  rejected: { label: "مرفوض", color: "bg-gray-500/20 text-gray-300 border-gray-500/30" },
};

export default function RecruiterDashboard() {
  const { gangUser, isAuthenticated } = useGangAuth();
  const [, navigate] = useLocation();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showQuizLink, setShowQuizLink] = useState<{ id: number; name: string } | null>(null);
  const [form, setForm] = useState({ applicantName: "", applicantUserId: "", applicantUsername: "" });
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const gangId = gangUser?.gangId ?? 1;

  if (!isAuthenticated) { navigate("/"); return null; }

  const { data: applicants = [], refetch } = trpc.recruitment.list.useQuery({ gangId });

  const addMutation = trpc.recruitment.addApplicant.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة المتقدم بنجاح");
      setShowAddDialog(false);
      setForm({ applicantName: "", applicantUserId: "", applicantUsername: "" });
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateStatusMutation = trpc.recruitment.updateStatus.useMutation({
    onSuccess: () => { toast.success("تم تحديث الحالة"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const filtered = filterStatus === "all" ? applicants : applicants.filter(a => a.status === filterStatus);

  const quizUrl = (applicantId: number) =>
    `${window.location.origin}/quiz/${applicantId}/${gangId}`;

  const copyLink = (applicantId: number) => {
    navigator.clipboard.writeText(quizUrl(applicantId));
    toast.success("تم نسخ رابط الاختبار");
  };

  const stats = {
    total: applicants.length,
    pending: applicants.filter(a => a.status === "pending").length,
    passed: applicants.filter(a => a.status === "passed").length,
    accepted: applicants.filter(a => a.status === "accepted").length,
  };

  return (
    <GangDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">لوحة التوظيف</h1>
            <p className="text-gray-400 text-sm mt-1">إدارة المتقدمين واختبارهم</p>
          </div>
          <Button onClick={() => setShowAddDialog(true)} className="bg-purple-600 hover:bg-purple-700 gap-2">
            <UserPlus className="w-4 h-4" />
            إضافة متقدم
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "إجمالي المتقدمين", value: stats.total, icon: ClipboardList, color: "text-blue-400" },
            { label: "قيد الانتظار", value: stats.pending, icon: Clock, color: "text-yellow-400" },
            { label: "اجتازوا الاختبار", value: stats.passed, icon: CheckCircle, color: "text-green-400" },
            { label: "مقبولون", value: stats.accepted, icon: CheckCircle, color: "text-purple-400" },
          ].map((s, i) => (
            <Card key={i} className="bg-[#1a1a2e] border-purple-900/30">
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className={`w-8 h-8 ${s.color}`} />
                <div>
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-xs text-gray-400">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "passed", "failed", "accepted", "rejected"].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                filterStatus === s
                  ? "bg-purple-600 border-purple-500 text-white"
                  : "bg-[#1a1a2e] border-purple-900/30 text-gray-400 hover:border-purple-500/50"
              }`}
            >
              {s === "all" ? "الكل" : STATUS_LABELS[s]?.label}
            </button>
          ))}
        </div>

        {/* Applicants Table */}
        <Card className="bg-[#1a1a2e] border-purple-900/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base">قائمة المتقدمين ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>لا يوجد متقدمون</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(applicant => (
                  <div key={applicant.id} className="bg-[#0d0d1a] border border-purple-900/20 rounded-lg p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-semibold">{applicant.applicantName}</span>
                          <Badge className={`text-xs border ${STATUS_LABELS[applicant.status]?.color}`}>
                            {STATUS_LABELS[applicant.status]?.label}
                          </Badge>
                        </div>
                        <div className="flex gap-4 text-xs text-gray-400">
                          <span>يوزر: <span className="text-purple-300 font-mono">{applicant.applicantUsername}</span></span>
                          <span>آيدي: <span className="text-purple-300 font-mono">{applicant.applicantUserId}</span></span>
                        </div>
                        <p className="text-xs text-gray-500">
                          أضافه: {applicant.recruiterUsername} — {new Date(applicant.createdAt).toLocaleDateString("ar-SA")}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {/* Copy quiz link */}
                        {(applicant.status === "pending") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10 gap-1 text-xs"
                            onClick={() => copyLink(applicant.id)}
                          >
                            <Copy className="w-3 h-3" />
                            نسخ رابط الاختبار
                          </Button>
                        )}
                        {/* Accept after passing */}
                        {applicant.status === "passed" && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 gap-1 text-xs"
                            onClick={() => updateStatusMutation.mutate({ applicantId: applicant.id, gangId, status: "accepted" })}
                          >
                            <CheckCircle className="w-3 h-3" />
                            قبول
                          </Button>
                        )}
                        {/* Reject */}
                        {["pending", "passed", "failed"].includes(applicant.status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500/30 text-red-300 hover:bg-red-500/10 gap-1 text-xs"
                            onClick={() => updateStatusMutation.mutate({ applicantId: applicant.id, gangId, status: "rejected" })}
                          >
                            <XCircle className="w-3 h-3" />
                            رفض
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Applicant Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-[#1a1a2e] border-purple-900/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-purple-300">إضافة متقدم جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-gray-300">اسم المتقدم</Label>
              <Input
                value={form.applicantName}
                onChange={e => setForm(f => ({ ...f, applicantName: e.target.value }))}
                placeholder="الاسم الكامل"
                className="bg-[#0d0d1a] border-purple-900/30 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">يوزر اللعبة (Copy User ID)</Label>
              <Input
                value={form.applicantUsername}
                onChange={e => setForm(f => ({ ...f, applicantUsername: e.target.value }))}
                placeholder="مثال: Player_123"
                className="bg-[#0d0d1a] border-purple-900/30 text-white font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">آيدي اللعبة (ID)</Label>
              <Input
                value={form.applicantUserId}
                onChange={e => setForm(f => ({ ...f, applicantUserId: e.target.value }))}
                placeholder="مثال: 12345"
                className="bg-[#0d0d1a] border-purple-900/30 text-white font-mono"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="border-gray-600 text-gray-300">
              إلغاء
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              disabled={!form.applicantName || !form.applicantUsername || !form.applicantUserId || addMutation.isPending}
              onClick={() => addMutation.mutate({ gangId, ...form })}
            >
              {addMutation.isPending ? "جاري الإضافة..." : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GangDashboardLayout>
  );
}
