import { useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useGangAuth } from "@/contexts/GangAuthContext";
import GangDashboardLayout, { GANG_NAMES } from "@/components/GangDashboardLayout";
import { Loader2, Activity } from "lucide-react";

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  add_member: { label: "إضافة عضو", color: "text-green-400" },
  remove_member: { label: "حذف عضو", color: "text-red-400" },
  warn_member: { label: "تحذير عضو", color: "text-amber-400" },
  promote_member: { label: "ترقية عضو", color: "text-blue-400" },
  status_fired: { label: "فصل عضو", color: "text-red-500" },
  status_suspended: { label: "تعليق عضو", color: "text-orange-400" },
  status_active: { label: "تفعيل عضو", color: "text-green-400" },
  create_report: { label: "رفع تقرير", color: "text-purple-400" },
  create_announcement: { label: "إعلان جديد", color: "text-blue-400" },
  create_scenario: { label: "سيناريو جديد", color: "text-violet-400" },
  record_attendance: { label: "تسجيل حضور", color: "text-teal-400" },
  create_user: { label: "إنشاء مستخدم", color: "text-cyan-400" },
  activate_user: { label: "تفعيل مستخدم", color: "text-green-400" },
  deactivate_user: { label: "تعطيل مستخدم", color: "text-red-400" },
  delete_user: { label: "حذف مستخدم", color: "text-red-500" },
};

export default function ActivityLog() {
  const { loading, isSuperAdmin } = useGangAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !isSuperAdmin) navigate("/dashboard");
  }, [loading, isSuperAdmin]);

  const { data: activity, isLoading } = trpc.superadmin.allActivity.useQuery();

  return (
    <GangDashboardLayout title="سجل النشاط">
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            سجل النشاط الكامل
          </h2>
          <p className="text-gray-500 text-sm">جميع العمليات في النظام</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-purple-500" /></div>
        ) : (
          <div className="bg-[#12121a] border border-purple-900/20 rounded-2xl overflow-hidden">
            <div className="divide-y divide-purple-900/10">
              {activity?.map(log => {
                const actionInfo = ACTION_LABELS[log.action] ?? { label: log.action, color: "text-gray-400" };
                return (
                  <div key={log.id} className="flex items-center gap-4 px-5 py-3 hover:bg-purple-900/5 transition-colors">
                    <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-medium ${actionInfo.color}`}>{actionInfo.label}</span>
                        {log.gangId && (
                          <span className="text-xs bg-gray-900/50 text-gray-400 px-2 py-0.5 rounded-lg">
                            {GANG_NAMES[log.gangId]?.display ?? `عصابة ${log.gangId}`}
                          </span>
                        )}
                      </div>
                      {log.details && <p className="text-gray-500 text-xs truncate">{log.details}</p>}
                    </div>
                    <span className="text-gray-600 text-xs flex-shrink-0">
                      {new Date(log.createdAt).toLocaleString("ar-SA")}
                    </span>
                  </div>
                );
              })}
              {(!activity || activity.length === 0) && (
                <div className="text-center py-12 text-gray-600">لا يوجد نشاط</div>
              )}
            </div>
          </div>
        )}
      </div>
    </GangDashboardLayout>
  );
}
