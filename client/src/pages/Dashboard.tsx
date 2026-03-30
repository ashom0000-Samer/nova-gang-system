import { useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useGangAuth } from "@/contexts/GangAuthContext";
import GangDashboardLayout, { GANG_NAMES, GANG_COLORS } from "@/components/GangDashboardLayout";
import { Users, FileText, Swords, CalendarCheck, TrendingUp, AlertTriangle, UserX, Shield } from "lucide-react";
import { Loader2 } from "lucide-react";

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: React.ComponentType<{ className?: string }>; color: string }) {
  return (
    <div className="bg-[#12121a] border border-purple-900/20 rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-gray-400 text-sm">{label}</p>
        <p className="text-white text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}

function GangOverviewCard({ gangId }: { gangId: number }) {
  const gangInfo = GANG_NAMES[gangId];
  const gangSlug = gangInfo?.slug ?? "nova_blinders";
  const colors = GANG_COLORS[gangSlug];
  const { data: stats, isLoading } = trpc.gangs.stats.useQuery({ gangId });

  if (isLoading) return (
    <div className={`bg-[#12121a] border ${colors.border} rounded-2xl p-6 flex items-center justify-center`}>
      <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
    </div>
  );

  return (
    <div className={`bg-[#12121a] border ${colors.border} rounded-2xl p-6`}>
      <h3 className={`text-lg font-bold mb-4 ${colors.text}`}>{gangInfo?.display}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{stats?.activeMembers ?? 0}</p>
          <p className="text-xs text-gray-500">أعضاء نشطون</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{stats?.totalMembers ?? 0}</p>
          <p className="text-xs text-gray-500">إجمالي الأعضاء</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-amber-400">{stats?.warnedMembers ?? 0}</p>
          <p className="text-xs text-gray-500">محذّرون</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-400">{stats?.totalReports ?? 0}</p>
          <p className="text-xs text-gray-500">تقارير</p>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { gangUser, loading, isAuthenticated, isSuperAdmin } = useGangAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
  }, [loading, isAuthenticated]);

  const gangId = gangUser?.gangId ?? 1;
  const { data: stats, isLoading: statsLoading } = trpc.gangs.stats.useQuery(
    { gangId },
    { enabled: !isSuperAdmin && !!gangUser }
  );
  const { data: activity } = trpc.activity.gangActivity.useQuery(
    { gangId },
    { enabled: !isSuperAdmin && !!gangUser }
  );

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
    </div>
  );

  if (!isAuthenticated) return null;

  const gangInfo = gangUser?.gangId ? GANG_NAMES[gangUser.gangId] : null;
  const gangSlug = gangInfo?.slug ?? "nova_blinders";
  const colors = GANG_COLORS[gangSlug];

  return (
    <GangDashboardLayout title="لوحة التحكم">
      {isSuperAdmin ? (
        // SUPERADMIN VIEW
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">مرحباً، {gangUser?.displayName} 👑</h2>
            <p className="text-gray-500 text-sm">نظرة شاملة على جميع العصابات</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GangOverviewCard gangId={1} />
            <GangOverviewCard gangId={2} />
            <GangOverviewCard gangId={3} />
          </div>

          <div className="bg-[#12121a] border border-purple-900/20 rounded-2xl p-6">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-400" />
              إجراءات سريعة
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "إدارة المستخدمين", href: "/dashboard/users", icon: "👥" },
                { label: "جميع التقارير", href: "/dashboard/all-reports", icon: "📋" },
                { label: "إعلان عام", href: "/dashboard/announcements", icon: "📢" },
                { label: "سجل النشاط", href: "/dashboard/activity", icon: "📊" },
              ].map(item => (
                <a key={item.href} href={item.href} className="bg-purple-900/20 hover:bg-purple-900/30 border border-purple-800/30 rounded-xl p-4 text-center transition-colors cursor-pointer">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <p className="text-sm text-gray-300">{item.label}</p>
                </a>
              ))}
            </div>
          </div>
        </div>
      ) : (
        // GANG ADMIN VIEW
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">مرحباً، {gangUser?.displayName}</h2>
            <p className={`text-sm font-medium ${colors.text}`}>{gangInfo?.display}</p>
          </div>

          {/* Stats Grid */}
          {statsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-purple-500" /></div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="الأعضاء النشطون" value={stats?.activeMembers ?? 0} icon={Users} color="bg-green-900/30 text-green-400" />
              <StatCard label="إجمالي الأعضاء" value={stats?.totalMembers ?? 0} icon={TrendingUp} color="bg-purple-900/30 text-purple-400" />
              <StatCard label="محذّرون" value={stats?.warnedMembers ?? 0} icon={AlertTriangle} color="bg-amber-900/30 text-amber-400" />
              <StatCard label="مفصولون" value={stats?.firedMembers ?? 0} icon={UserX} color="bg-red-900/30 text-red-400" />
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="التقارير" value={stats?.totalReports ?? 0} icon={FileText} color="bg-blue-900/30 text-blue-400" />
            <StatCard label="السيناريوهات" value={stats?.totalScenarios ?? 0} icon={Swords} color="bg-violet-900/30 text-violet-400" />
          </div>

          {/* Quick Actions */}
          <div className="bg-[#12121a] border border-purple-900/20 rounded-2xl p-6">
            <h3 className="text-white font-bold mb-4">إجراءات سريعة</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "قائمة الأعضاء", href: "/dashboard/members", icon: "👥" },
                { label: "إضافة عضو", href: "/dashboard/recruitment", icon: "➕" },
                { label: "رفع تقرير", href: "/dashboard/reports", icon: "📋" },
                { label: "تسجيل حضور", href: "/dashboard/attendance", icon: "✅" },
              ].map(item => (
                <a key={item.href} href={item.href} className={`${colors.bg} hover:opacity-80 border ${colors.border} rounded-xl p-4 text-center transition-colors cursor-pointer`}>
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <p className="text-sm text-gray-300">{item.label}</p>
                </a>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          {activity && activity.length > 0 && (
            <div className="bg-[#12121a] border border-purple-900/20 rounded-2xl p-6">
              <h3 className="text-white font-bold mb-4">آخر النشاطات</h3>
              <div className="space-y-2">
                {activity.slice(0, 8).map(log => (
                  <div key={log.id} className="flex items-center gap-3 py-2 border-b border-purple-900/10 last:border-0">
                    <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
                    <span className="text-gray-300 text-sm flex-1">{log.action.replace(/_/g, " ")}</span>
                    {log.details && <span className="text-gray-500 text-xs truncate max-w-[150px]">{log.details}</span>}
                    <span className="text-gray-600 text-xs flex-shrink-0">
                      {new Date(log.createdAt).toLocaleDateString("ar-SA")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </GangDashboardLayout>
  );
}
