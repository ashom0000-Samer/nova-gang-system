import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Loader2, Lock, User, Eye, EyeOff } from "lucide-react";
import { useGangAuth } from "@/contexts/GangAuthContext";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663489931889/NxGxDk4wLnX9DjzMgAjR4x/nova-rp-logo_4d32ec41.png";

export default function Login() {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { gangUser, loading, refetch } = useGangAuth();

  // توجيه المستخدم حسب رتبته بعد الدخول
  const getRedirectPath = (role: string, gangRank?: string | null) => {
    if (role === "superadmin") return "/gang-selector";
    if (role === "gang_supervisor") {
      // BIG BOSS يرى الثلاث عصابات
      if (gangRank && gangRank.includes("BIG BOSS")) return "/gang-selector";
      // SILENT HAND يدخل مباشرة لعصابته
      return "/dashboard";
    }
    if (role === "recruiter") return "/dashboard/recruiter";
    return "/dashboard";
  };

  useEffect(() => {
    if (!loading && gangUser) {
      navigate(getRedirectPath(gangUser.role, gangUser.gangRank));
    }
  }, [loading, gangUser]);

  const utils = trpc.useUtils();

  const loginMutation = trpc.gangAuth.login.useMutation({
    onSuccess: async (data) => {
      toast.success(`مرحباً ${data.user.displayName}!`);
      await utils.gangAuth.me.invalidate();
      refetch();
      const path = getRedirectPath(data.user.role, data.user.gangRank);
      setTimeout(() => navigate(path), 300);
    },
    onError: (err) => {
      toast.error(err.message || "خطأ في تسجيل الدخول");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error("يرجى إدخال اسم المستخدم وكلمة المرور");
      return;
    }
    loginMutation.mutate({ username: username.trim(), password });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center relative overflow-hidden" dir="rtl">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-900/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-red-900/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-950/10 rounded-full blur-3xl" />
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `linear-gradient(rgba(139,92,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.3) 1px, transparent 1px)`,
          backgroundSize: "50px 50px"
        }} />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500/30 rounded-full blur-xl scale-150" />
              <img
                src={LOGO_URL}
                alt="Nova RP"
                className="relative w-24 h-24 rounded-full object-cover border-2 border-purple-500/50 shadow-2xl shadow-purple-500/20"
              />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-1 tracking-wider">
            <span className="text-purple-400">NOVA</span> RP
          </h1>
          <p className="text-gray-400 text-sm">نظام إدارة العصابات</p>
          <div className="mt-2 flex justify-center gap-2 text-lg">
            <span>👾</span><span>🕸️</span><span>🚬</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-[#12121a]/90 backdrop-blur-xl border border-purple-900/30 rounded-2xl p-8 shadow-2xl shadow-purple-900/20">
          <h2 className="text-xl font-bold text-white mb-6 text-center">تسجيل الدخول</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400 font-medium">اسم المستخدم</label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="أدخل اسم المستخدم"
                  className="w-full bg-[#1a1a2e] border border-purple-900/40 rounded-xl py-3 pr-10 pl-4 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition-all"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400 font-medium">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور"
                  className="w-full bg-[#1a1a2e] border border-purple-900/40 rounded-xl py-3 pr-10 pl-10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition-all"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-purple-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-gradient-to-r from-purple-700 to-violet-600 hover:from-purple-600 hover:to-violet-500 text-white font-bold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loginMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> جاري الدخول...</>
              ) : (
                "دخول"
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-purple-900/20 text-center">
            <p className="text-xs text-gray-600">
              للحصول على حساب، تواصل مع المشرف الرئيسي
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-700 text-xs mt-6">
          Nova RP © 2025 — جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  );
}
