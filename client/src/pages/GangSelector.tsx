import { useLocation } from "wouter";
import { useGangAuth } from "@/contexts/GangAuthContext";
import { useEffect } from "react";

const GANGS = [
  {
    id: 1,
    name: "➥👾〡𝐍𝐨𝐯𝐚 𝐁𝐥𝐢𝐧𝐝𝐞𝐫𝐬",
    color: "from-purple-900/60 to-purple-800/30",
    border: "border-purple-500/40 hover:border-purple-400",
    glow: "hover:shadow-purple-500/20",
    emoji: "👾",
    bg: "bg-purple-600/20",
    textColor: "text-purple-300",
  },
  {
    id: 2,
    name: "➥🕸️〡𝐃𝐞𝐚𝐭𝐡 𝐕𝐚𝐥𝐥𝐞𝐲",
    color: "from-gray-900/60 to-gray-800/30",
    border: "border-gray-500/40 hover:border-gray-300",
    glow: "hover:shadow-gray-500/20",
    emoji: "🕸️",
    bg: "bg-gray-600/20",
    textColor: "text-gray-300",
  },
  {
    id: 3,
    name: "➥🚬〡𝐎𝐥𝐝 𝐒𝐜𝐡𝐨𝐨𝐥",
    color: "from-amber-900/60 to-amber-800/30",
    border: "border-amber-500/40 hover:border-amber-400",
    glow: "hover:shadow-amber-500/20",
    emoji: "🚬",
    bg: "bg-amber-600/20",
    textColor: "text-amber-300",
  },
];

export default function GangSelector() {
  const { gangUser, isAuthenticated, loading } = useGangAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/");
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleSelectGang = (gangId: number) => {
    // Store selected gang in sessionStorage for this session
    sessionStorage.setItem("selectedGangId", String(gangId));
    navigate("/dashboard");
  };

  const handleViewAll = () => {
    sessionStorage.removeItem("selectedGangId");
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#0a0a14] flex flex-col items-center justify-center p-6" dir="rtl">
      {/* Logo */}
      <div className="text-center mb-10">
        <div className="text-5xl mb-3">👾</div>
        <h1 className="text-3xl font-bold text-white">
          <span className="text-purple-400">NOVA</span> RP
        </h1>
        <p className="text-gray-400 mt-1 text-sm">نظام إدارة العصابات</p>
      </div>

      {/* Welcome */}
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-white">
          مرحباً، <span className="text-purple-300">{gangUser?.displayName}</span>
        </h2>
        <p className="text-gray-400 text-sm mt-1">اختر العصابة التي تريد إدارتها</p>
      </div>

      {/* Gang Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full mb-6">
        {GANGS.map(gang => (
          <button
            key={gang.id}
            onClick={() => handleSelectGang(gang.id)}
            className={`bg-gradient-to-br ${gang.color} border ${gang.border} rounded-2xl p-6 text-center transition-all duration-300 hover:scale-105 hover:shadow-xl ${gang.glow} group`}
          >
            <div className={`w-16 h-16 ${gang.bg} rounded-full flex items-center justify-center mx-auto mb-4 text-3xl group-hover:scale-110 transition-transform`}>
              {gang.emoji}
            </div>
            <p className={`font-bold text-sm ${gang.textColor} leading-relaxed`}>
              {gang.name}
            </p>
            <p className="text-gray-500 text-xs mt-2">انقر للدخول</p>
          </button>
        ))}
      </div>

      {/* View All option for superadmin */}
      {gangUser?.role === "superadmin" && (
        <button
          onClick={handleViewAll}
          className="text-gray-400 hover:text-purple-300 text-sm underline underline-offset-4 transition-colors"
        >
          عرض إحصائيات الكل دفعة واحدة
        </button>
      )}
    </div>
  );
}
