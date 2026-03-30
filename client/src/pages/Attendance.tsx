import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useGangAuth } from "@/contexts/GangAuthContext";
import GangDashboardLayout, { GANG_COLORS, GANG_NAMES } from "@/components/GangDashboardLayout";
import { toast } from "sonner";
import { Loader2, Plus, CalendarCheck, User } from "lucide-react";

const SESSION_TYPES = [
  { value: "regular", label: "عادي", emoji: "📅" },
  { value: "event", label: "فعالية", emoji: "🎯" },
  { value: "training", label: "تدريب", emoji: "⚔️" },
  { value: "meeting", label: "اجتماع", emoji: "🗣️" },
];

export default function Attendance() {
  const { gangUser, loading, isAuthenticated } = useGangAuth();
  const [, navigate] = useLocation();
  const [showRecord, setShowRecord] = useState(false);
  const [form, setForm] = useState({
    attendantName: gangUser?.displayName ?? "",
    attendanceDate: new Date().toISOString().split("T")[0],
    sessionType: "regular" as "regular" | "event" | "training" | "meeting",
    notes: "",
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
    if (gangUser?.displayName) setForm(f => ({ ...f, attendantName: gangUser.displayName }));
  }, [loading, isAuthenticated, gangUser]);

  const gangId = gangUser?.gangId ?? 1;
  const gangSlug = gangUser?.gangId ? GANG_NAMES[gangUser.gangId]?.slug ?? "nova_blinders" : "nova_blinders";
  const colors = GANG_COLORS[gangSlug];
  const utils = trpc.useUtils();

  const { data: attendanceList, isLoading } = trpc.attendance.list.useQuery({ gangId }, { enabled: !!gangUser });

  const recordMutation = trpc.attendance.record.useMutation({
    onSuccess: () => {
      toast.success("تم تسجيل الحضور");
      setShowRecord(false);
      utils.attendance.list.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  const sessionTypeMap = Object.fromEntries(SESSION_TYPES.map(s => [s.value, s]));

  // Group by date
  const grouped = attendanceList?.reduce((acc, item) => {
    const date = new Date(item.attendanceDate).toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {} as Record<string, typeof attendanceList>) ?? {};

  return (
    <GangDashboardLayout title="دفتر الحضور">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">دفتر الحضور</h2>
            <p className="text-gray-500 text-sm">{attendanceList?.length ?? 0} سجل</p>
          </div>
          <button
            onClick={() => setShowRecord(!showRecord)}
            className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            تسجيل حضور
          </button>
        </div>

        {/* Record Form */}
        {showRecord && (
          <div className={`bg-[#12121a] border ${colors.border} rounded-2xl p-6`}>
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-purple-400" />
              تسجيل حضور جديد
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">اسم الحاضر *</label>
                <input
                  value={form.attendantName}
                  onChange={e => setForm(f => ({ ...f, attendantName: e.target.value }))}
                  placeholder="اسم الشخص"
                  className="w-full bg-[#1a1a2e] border border-purple-900/40 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">التاريخ</label>
                <input
                  type="date"
                  value={form.attendanceDate}
                  onChange={e => setForm(f => ({ ...f, attendanceDate: e.target.value }))}
                  className="w-full bg-[#1a1a2e] border border-purple-900/40 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">نوع الجلسة</label>
                <div className="flex gap-2 flex-wrap">
                  {SESSION_TYPES.map(s => (
                    <button
                      key={s.value}
                      onClick={() => setForm(f => ({ ...f, sessionType: s.value as typeof form.sessionType }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition-colors ${form.sessionType === s.value ? `${colors.bg} ${colors.text} border ${colors.border}` : "bg-[#1a1a2e] text-gray-500 hover:text-gray-300"}`}
                    >
                      {s.emoji} {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">ملاحظات</label>
                <input
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="ملاحظات إضافية (اختياري)"
                  className="w-full bg-[#1a1a2e] border border-purple-900/40 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => recordMutation.mutate({ gangId, ...form, attendanceDate: new Date(form.attendanceDate).toISOString() })}
                disabled={recordMutation.isPending || !form.attendantName.trim()}
                className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 text-white px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {recordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarCheck className="w-4 h-4" />}
                تسجيل
              </button>
              <button onClick={() => setShowRecord(false)} className="px-5 py-2 rounded-xl text-sm text-gray-400 border border-gray-700">إلغاء</button>
            </div>
          </div>
        )}

        {/* Attendance List */}
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-purple-500" /></div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([date, records]) => (
              <div key={date} className="bg-[#12121a] border border-purple-900/20 rounded-2xl overflow-hidden">
                <div className={`px-5 py-3 ${colors.bg} border-b ${colors.border}`}>
                  <h3 className={`text-sm font-semibold ${colors.text}`}>{date}</h3>
                  <p className="text-gray-500 text-xs">{records.length} حضور</p>
                </div>
                <div className="divide-y divide-purple-900/10">
                  {records.map(record => {
                    const sessionInfo = sessionTypeMap[record.sessionType];
                    return (
                      <div key={record.id} className="flex items-center justify-between px-5 py-3 hover:bg-purple-900/5 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${colors.bg} flex items-center justify-center ${colors.text} text-sm font-bold border ${colors.border}`}>
                            {record.attendantName[0]}
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">{record.attendantName}</p>
                            {record.notes && <p className="text-gray-500 text-xs">{record.notes}</p>}
                          </div>
                        </div>
                        <span className="text-sm">{sessionInfo?.emoji} <span className="text-gray-400 text-xs">{sessionInfo?.label}</span></span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {Object.keys(grouped).length === 0 && (
              <div className="text-center py-12 text-gray-600">لا يوجد سجلات حضور</div>
            )}
          </div>
        )}
      </div>
    </GangDashboardLayout>
  );
}
