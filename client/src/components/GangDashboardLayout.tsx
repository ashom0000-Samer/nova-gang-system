import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useGangAuth } from "@/contexts/GangAuthContext";
import { toast } from "sonner";
import {
  LayoutDashboard, Users, UserPlus, FileText, Megaphone,
  Swords, CalendarCheck, LogOut, Menu, X, ChevronDown,
  Shield, Settings, Bell, Activity, MessageSquareWarning, AlertTriangle, Building2
} from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663489931889/NxGxDk4wLnX9DjzMgAjR4x/nova-rp-logo_4d32ec41.png";

const GANG_COLORS: Record<string, { primary: string; bg: string; border: string; text: string }> = {
  nova_blinders: { primary: "#7C3AED", bg: "bg-purple-900/20", border: "border-purple-700/40", text: "text-purple-400" },
  death_valley: { primary: "#DC2626", bg: "bg-red-900/20", border: "border-red-700/40", text: "text-red-400" },
  old_school: { primary: "#D97706", bg: "bg-amber-900/20", border: "border-amber-700/40", text: "text-amber-400" },
};

const GANG_NAMES: Record<number, { display: string; slug: string }> = {
  1: { display: "➥👾〡𝐍𝐨𝐯𝐚 𝐁𝐥𝐢𝐧𝐝𝐞𝐫𝐬", slug: "nova_blinders" },
  2: { display: "➥🕸️〡𝐃𝐞𝐚𝐭𝐡 𝐕𝐚𝐥𝐥𝐞𝐲", slug: "death_valley" },
  3: { display: "➥🚬〡𝐎𝐥𝐝 𝐒𝐜𝐡𝐨𝐨𝐥", slug: "old_school" },
};

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

const GANG_NAV: NavItem[] = [
  { label: "الرئيسية", icon: LayoutDashboard, href: "/dashboard" },
  { label: "الأعضاء", icon: Users, href: "/dashboard/members" },
  { label: "التوظيف", icon: UserPlus, href: "/dashboard/recruitment" },
  { label: "التقارير", icon: FileText, href: "/dashboard/reports" },
  { label: "الإعلانات", icon: Megaphone, href: "/dashboard/announcements" },
  { label: "السيناريوهات", icon: Swords, href: "/dashboard/scenarios" },
  { label: "دفتر الحضور", icon: CalendarCheck, href: "/dashboard/attendance" },
  { label: "الإجراءات التأديبية", icon: AlertTriangle, href: "/dashboard/disciplinary" },
  { label: "الشكاوى", icon: MessageSquareWarning, href: "/dashboard/complaints" },
  { label: "الأقسام", icon: Building2, href: "/dashboard/departments" },
];

const SUPERADMIN_NAV: NavItem[] = [
  { label: "نظرة عامة", icon: LayoutDashboard, href: "/dashboard" },
  { label: "إدارة المستخدمين", icon: Shield, href: "/dashboard/users" },
  { label: "جميع التقارير", icon: FileText, href: "/dashboard/all-reports" },
  { label: "الإعلانات العامة", icon: Megaphone, href: "/dashboard/announcements" },
  { label: "جميع الشكاوى", icon: MessageSquareWarning, href: "/dashboard/complaints" },
  { label: "سجل النشاط", icon: Activity, href: "/dashboard/activity" },
];

interface GangDashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function GangDashboardLayout({ children, title }: GangDashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();
  const { gangUser, isSuperAdmin } = useGangAuth();
  const utils = trpc.useUtils();

  const logoutMutation = trpc.gangAuth.logout.useMutation({
    onSuccess: () => {
      utils.gangAuth.me.invalidate();
      window.location.href = "/";
    },
  });

  const gangSlug = gangUser?.gangId ? GANG_NAMES[gangUser.gangId]?.slug : null;
  const gangColors = gangSlug ? GANG_COLORS[gangSlug] : GANG_COLORS.nova_blinders;
  const gangDisplay = gangUser?.gangId ? GANG_NAMES[gangUser.gangId]?.display : null;

  const isRecruiter = gangUser?.role === "recruiter";

  const RECRUITER_NAV: NavItem[] = [
    { label: "الرئيسية", icon: LayoutDashboard, href: "/dashboard" },
    { label: "التوظيف", icon: UserPlus, href: "/dashboard/recruitment" },
  ];

  const navItems = isSuperAdmin ? SUPERADMIN_NAV : isRecruiter ? RECRUITER_NAV : GANG_NAV;

  const roleLabel = {
    superadmin: "المشرف الرئيسي",
    gang_admin: "مسؤول العصابة",
    gang_supervisor: "مشرف العصابة",
    recruiter: "مسؤول التوظيف",
  }[gangUser?.role ?? "gang_admin"];

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex" dir="rtl">
      {/* Sidebar Overlay (mobile) */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 right-0 h-full w-64 bg-[#0d0d18] border-l border-purple-900/20 z-30
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "translate-x-full"}
        lg:relative lg:translate-x-0 lg:flex lg:flex-col
      `}>
        {/* Logo */}
        <div className="p-5 border-b border-purple-900/20">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Nova RP" className="w-10 h-10 rounded-full object-cover border border-purple-500/40" />
            <div>
              <div className="text-white font-bold text-sm">NOVA RP</div>
              <div className="text-gray-500 text-xs">نظام الإدارة</div>
            </div>
            <button className="mr-auto lg:hidden text-gray-400" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Gang Badge */}
        {gangDisplay && (
          <div className={`mx-3 mt-3 p-3 rounded-xl ${gangColors.bg} border ${gangColors.border}`}>
            <p className="text-xs text-gray-400 mb-1">{roleLabel}</p>
            <p className={`text-sm font-bold ${gangColors.text} leading-tight`}>{gangDisplay}</p>
          </div>
        )}
        {isSuperAdmin && (
          <div className="mx-3 mt-3 p-3 rounded-xl bg-gradient-to-r from-purple-900/30 to-violet-900/20 border border-purple-700/40">
            <p className="text-xs text-gray-400 mb-1">الصلاحية</p>
            <p className="text-sm font-bold text-purple-300">🔑 المشرف الرئيسي</p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto mt-2">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <a
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? `bg-purple-700/30 text-purple-300 border border-purple-700/40`
                      : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className={`w-4 h-4 ${isActive ? "text-purple-400" : ""}`} />
                  {item.label}
                </a>
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-purple-900/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-purple-700/40 flex items-center justify-center text-purple-300 font-bold text-sm border border-purple-600/30">
              {gangUser?.displayName?.[0] ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{gangUser?.displayName}</p>
              <p className="text-gray-500 text-xs truncate">@{gangUser?.username}</p>
            </div>
          </div>
          <button
            onClick={() => logoutMutation.mutate()}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:mr-0">
        {/* Top Bar */}
        <header className="bg-[#0d0d18]/80 backdrop-blur border-b border-purple-900/20 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
          <button
            className="lg:hidden text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-white font-bold text-lg flex-1">{title || "لوحة التحكم"}</h1>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-400">
              <span className="text-gray-600">|</span>
              <span>{gangUser?.displayName}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export { GANG_NAMES, GANG_COLORS };
