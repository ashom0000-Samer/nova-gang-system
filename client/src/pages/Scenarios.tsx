import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useGangAuth } from "@/contexts/GangAuthContext";
import GangDashboardLayout, { GANG_COLORS, GANG_NAMES } from "@/components/GangDashboardLayout";
import { toast } from "sonner";
import { Loader2, Plus, Swords, Users, ChevronDown, ChevronUp, X } from "lucide-react";

export default function Scenarios() {
  const { gangUser, loading, isAuthenticated } = useGangAuth();
  const [, navigate] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [expandedScenario, setExpandedScenario] = useState<number | null>(null);
  const [showAddParticipant, setShowAddParticipant] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", description: "", scenarioDate: new Date().toISOString().split("T")[0] });
  const [participantForm, setParticipantForm] = useState({ participantName: "", role: "", notes: "" });

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
  }, [loading, isAuthenticated]);

  const gangId = gangUser?.gangId ?? 1;
  const gangSlug = gangUser?.gangId ? GANG_NAMES[gangUser.gangId]?.slug ?? "nova_blinders" : "nova_blinders";
  const colors = GANG_COLORS[gangSlug];
  const utils = trpc.useUtils();

  const { data: scenarios, isLoading } = trpc.scenarios.list.useQuery({ gangId }, { enabled: !!gangUser });
  const { data: participations } = trpc.scenarios.participations.useQuery(
    { scenarioId: expandedScenario!, gangId },
    { enabled: !!expandedScenario }
  );

  const createMutation = trpc.scenarios.create.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء السيناريو");
      setShowCreate(false);
      setForm({ title: "", description: "", scenarioDate: new Date().toISOString().split("T")[0] });
      utils.scenarios.list.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  const addParticipantMutation = trpc.scenarios.addParticipation.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة المشارك");
      setParticipantForm({ participantName: "", role: "", notes: "" });
      utils.scenarios.participations.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  return (
    <GangDashboardLayout title="السيناريوهات">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">السيناريوهات</h2>
            <p className="text-gray-500 text-sm">{scenarios?.length ?? 0} سيناريو</p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            سيناريو جديد
          </button>
        </div>

        {/* Create Form */}
        {showCreate && (
          <div className={`bg-[#12121a] border ${colors.border} rounded-2xl p-6`}>
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Swords className="w-5 h-5 text-purple-400" />
              إنشاء سيناريو جديد
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-sm text-gray-400 mb-1 block">عنوان السيناريو *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="عنوان السيناريو"
                  className="w-full bg-[#1a1a2e] border border-purple-900/40 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">تاريخ السيناريو</label>
                <input
                  type="date"
                  value={form.scenarioDate}
                  onChange={e => setForm(f => ({ ...f, scenarioDate: e.target.value }))}
                  className="w-full bg-[#1a1a2e] border border-purple-900/40 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">وصف السيناريو</label>
                <input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="وصف مختصر (اختياري)"
                  className="w-full bg-[#1a1a2e] border border-purple-900/40 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => createMutation.mutate({ gangId, ...form, scenarioDate: new Date(form.scenarioDate).toISOString() })}
                disabled={createMutation.isPending || !form.title.trim()}
                className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 text-white px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
                إنشاء
              </button>
              <button onClick={() => setShowCreate(false)} className="px-5 py-2 rounded-xl text-sm text-gray-400 border border-gray-700">إلغاء</button>
            </div>
          </div>
        )}

        {/* Scenarios List */}
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-purple-500" /></div>
        ) : (
          <div className="space-y-3">
            {scenarios?.map(scenario => (
              <div key={scenario.id} className="bg-[#12121a] border border-purple-900/20 rounded-2xl overflow-hidden">
                <div
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-purple-900/5 transition-colors"
                  onClick={() => setExpandedScenario(expandedScenario === scenario.id ? null : scenario.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center border ${colors.border}`}>
                      <Swords className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{scenario.title}</h3>
                      <p className="text-gray-500 text-xs">
                        {new Date(scenario.scenarioDate).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
                        {scenario.description && ` — ${scenario.description}`}
                      </p>
                    </div>
                  </div>
                  {expandedScenario === scenario.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>

                {/* Expanded: Participations */}
                {expandedScenario === scenario.id && (
                  <div className="border-t border-purple-900/20 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-gray-300 text-sm font-medium flex items-center gap-2">
                        <Users className="w-4 h-4" /> المشاركون
                      </h4>
                      <button
                        onClick={() => setShowAddParticipant(showAddParticipant === scenario.id ? null : scenario.id)}
                        className="text-xs flex items-center gap-1 text-purple-400 hover:text-purple-300"
                      >
                        <Plus className="w-3 h-3" /> إضافة مشارك
                      </button>
                    </div>

                    {showAddParticipant === scenario.id && (
                      <div className="bg-[#1a1a2e] rounded-xl p-4 mb-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input
                          value={participantForm.participantName}
                          onChange={e => setParticipantForm(f => ({ ...f, participantName: e.target.value }))}
                          placeholder="اسم المشارك *"
                          className="bg-[#0d0d18] border border-purple-900/40 rounded-xl py-2 px-3 text-white text-sm focus:outline-none focus:border-purple-500"
                        />
                        <input
                          value={participantForm.role}
                          onChange={e => setParticipantForm(f => ({ ...f, role: e.target.value }))}
                          placeholder="الدور (اختياري)"
                          className="bg-[#0d0d18] border border-purple-900/40 rounded-xl py-2 px-3 text-white text-sm focus:outline-none focus:border-purple-500"
                        />
                        <button
                          onClick={() => addParticipantMutation.mutate({ scenarioId: scenario.id, gangId, ...participantForm })}
                          disabled={addParticipantMutation.isPending || !participantForm.participantName.trim()}
                          className="bg-purple-700 hover:bg-purple-600 text-white rounded-xl py-2 px-4 text-sm disabled:opacity-50"
                        >
                          {addParticipantMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "إضافة"}
                        </button>
                      </div>
                    )}

                    <div className="space-y-2">
                      {participations?.map(p => (
                        <div key={p.id} className="flex items-center gap-3 bg-[#1a1a2e] rounded-xl px-4 py-2.5">
                          <div className={`w-7 h-7 rounded-full ${colors.bg} flex items-center justify-center ${colors.text} text-xs font-bold`}>
                            {p.participantName[0]}
                          </div>
                          <div>
                            <p className="text-white text-sm">{p.participantName}</p>
                            {p.role && <p className="text-gray-500 text-xs">{p.role}</p>}
                          </div>
                        </div>
                      ))}
                      {(!participations || participations.length === 0) && (
                        <p className="text-gray-600 text-sm text-center py-3">لا يوجد مشاركون بعد</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {(!scenarios || scenarios.length === 0) && (
              <div className="text-center py-12 text-gray-600">لا يوجد سيناريوهات</div>
            )}
          </div>
        )}
      </div>
    </GangDashboardLayout>
  );
}
