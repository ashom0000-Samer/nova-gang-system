import { useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle, XCircle, AlertTriangle, ChevronRight, ChevronLeft } from "lucide-react";

const QUIZ_QUESTIONS = [
  {
    question: "كم أقصى مدة يُسمح لك فيها بإبقاء الرهينة؟",
    options: ["15 دقيقة", "20 دقيقة", "10 دقائق", "25 دقيقة"],
    correct: 1,
  },
  {
    question: "عند دخول شخص مقر عصابتك، يحق لك خطفه أو قتله باستثناء:",
    options: ["المسعفين", "المواطنين", "الشرطة", "أعضاء العصابات الأخرى"],
    correct: 0,
  },
  {
    question: "كم المدة التي يجب انتظارها بعد الإعلان قبل مداهمة أي مقر؟",
    options: ["دقيقتان", "10 دقائق", "5 دقائق", "3 دقائق"],
    correct: 2,
  },
  {
    question: "هل يُسمح باستخدام أصدقائك في توهيم العساكر بأنهم رهائن؟",
    options: ["نعم", "لا. يمنع ذلك تماماً"],
    correct: 1,
  },
  {
    question: "متى يحق للعصابة رفض أي مداهمة عليها؟",
    options: ["لا يحق لها الرفض أبداً", "إذا كان عدد العصابة أقل من 5 في الراديو", "إذا كان القائد غير موجود"],
    correct: 1,
  },
  {
    question: "بعد كم يوم من عدم تفاعلك في العصابة يتم إنزال تحذير عليك؟",
    options: ["أسبوع", "يومين", "3 أيام", "يوم واحد"],
    correct: 2,
  },
  {
    question: "ما هو قانون الاستقالة من العصابة؟",
    options: [
      "الاستقالة تتطلب دفع مبلغ مالي",
      "يحق لك الاستقالة في أي وقت",
      "لا يحق لك الاستقالة إلا بعد 7 أيام",
      "لا يحق لك الاستقالة إلا بعد 14 يوماً",
    ],
    correct: 3,
  },
  {
    question: "ما هو الحد الأقصى للإجازة الخارجية المسموح بها؟",
    options: ["7 أيام", "14 يوماً", "10 أيام", "شهر كامل"],
    correct: 1,
  },
  {
    question: "إذا هرب المخطوف من المنطقة الغير آمنة ودخل المنطقة الآمنة، هل يحق لك قتله؟",
    options: ["لا يحق لك قتله", "نعم"],
    correct: 0,
  },
  {
    question: "هل تستطيع خطف مواطن في المنطقة الآمنة؟",
    options: ["نعم بعد التحدث مع الشخص", "لَا مَمْنُوعٌ مَنْعًا بَاتًّا"],
    correct: 1,
  },
  {
    question: "هل يُسمح بالتفاوض على رهينة غير متواجدة في موقع السرقة؟",
    options: ["يمنع ذلك تماماً", "نعم"],
    correct: 0,
  },
  {
    question: "ماذا يحدث في حال \"التلفيت\" بعد الموت أو وقت الخطف؟",
    options: ["إنذار واحد", "إنذارين في العصابة", "خصم من الراتب", "طرد من العصابة"],
    correct: 3,
  },
  {
    question: "متى يُسمح للعصابة باستخدام الطيارات؟",
    options: [
      "عند الهروب من الشرطة فقط",
      "في حال وجود سيناريو فقط",
      "في أي وقت للترفيه",
      "يمنع استخدامها نهائياً",
    ],
    correct: 1,
  },
  {
    question: "هل يُسمح للعصابة بمحاولة السيطرة على المدينة الأولى؟",
    options: ["نعم", "يمنع ذلك تماماً"],
    correct: 1,
  },
  {
    question: "كم مرة يحق لأعضاء العصابة \"تلويت\" الشخص بعد قتله؟",
    options: ["ثلاث مرات", "مرتين", "مرة واحدة فقط", "غير محدود"],
    correct: 2,
  },
];

type QuizState = "intro" | "taking" | "result";

export default function QuizPage() {
  const params = useParams<{ applicantId: string; gangId: string }>();
  const applicantId = parseInt(params.applicantId ?? "0");
  const gangId = parseInt(params.gangId ?? "1");

  const [state, setState] = useState<QuizState>("intro");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>(new Array(15).fill(-1));
  const [result, setResult] = useState<{ score: number; passed: boolean; total: number } | null>(null);

  const submitQuiz = trpc.recruitment.submitQuiz.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setState("result");
    },
    onError: (e) => toast.error(e.message),
  });

  const selectAnswer = (idx: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQ] = idx;
    setAnswers(newAnswers);
  };

  const handleSubmit = () => {
    if (answers.some(a => a === -1)) {
      toast.error("يرجى الإجابة على جميع الأسئلة");
      return;
    }
    submitQuiz.mutate({ applicantId, gangId, answers });
  };

  const progress = ((currentQ + 1) / QUIZ_QUESTIONS.length) * 100;

  // Intro screen
  if (state === "intro") {
    return (
      <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-lg w-full">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="text-4xl mb-2">👾</div>
            <h1 className="text-3xl font-bold text-white">
              <span className="text-purple-400">NOVA</span> RP
            </h1>
            <p className="text-gray-400 mt-1">نظام إدارة العصابات</p>
          </div>

          <div className="bg-[#1a1a2e] border border-purple-900/30 rounded-2xl p-8 space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-white mb-2">اختبار القبول في العصابة</h2>
              <p className="text-gray-400 text-sm">
                هذا الاختبار مخصص لقياس مدى إلمامك بقوانين العصابات والخلط. ترجو التركيز والإجابة بدقة لضمان استمرارك في المنظمة.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                <div className="text-green-400 font-bold text-lg">9+</div>
                <div className="text-green-300 text-xs">درجة النجاح</div>
              </div>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                <div className="text-red-400 font-bold text-lg">8-</div>
                <div className="text-red-300 text-xs">درجة الرسوب</div>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
              <p className="text-yellow-300 text-xs">
                ملاحظة: الالتزام بالقوانين هو أساس احترافيتنا في مدينة Nova. يُمنع الغش أو البحث عن الإجابات.
              </p>
            </div>

            <div className="text-center text-sm text-gray-400">
              <span className="text-purple-300 font-bold">15 سؤال</span> — كل سؤال درجة واحدة
            </div>

            <Button
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 text-lg"
              onClick={() => setState("taking")}
            >
              ابدأ الاختبار
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Result screen
  if (state === "result" && result) {
    const percentage = Math.round((result.score / result.total) * 100);
    return (
      <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-lg w-full">
          <div className="bg-[#1a1a2e] border border-purple-900/30 rounded-2xl p-8 text-center space-y-6">
            {result.passed ? (
              <>
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-10 h-10 text-green-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-green-400">مبروك! اجتزت الاختبار</h2>
                  <p className="text-gray-400 mt-2">تواصل مع مسؤول التوظيف لإتمام إجراءات القبول</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                  <XCircle className="w-10 h-10 text-red-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-red-400">للأسف لم تجتز الاختبار</h2>
                  <p className="text-gray-400 mt-2">راجع قوانين العصابة وحاول مرة أخرى</p>
                </div>
              </>
            )}

            {/* Score display */}
            <div className="bg-[#0d0d1a] rounded-xl p-6">
              <div className="text-5xl font-bold text-white mb-1">
                {result.score}<span className="text-2xl text-gray-400">/{result.total}</span>
              </div>
              <div className="text-gray-400 text-sm">{percentage}% من الإجابات صحيحة</div>
              {/* Progress bar */}
              <div className="mt-4 h-3 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${result.passed ? "bg-green-500" : "bg-red-500"}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>

            <p className="text-gray-500 text-xs">
              تم تسجيل نتيجتك وإرسالها لمسؤول التوظيف تلقائياً
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Quiz taking screen
  const q = QUIZ_QUESTIONS[currentQ];
  const selectedAnswer = answers[currentQ];
  const answeredCount = answers.filter(a => a !== -1).length;

  return (
    <div className="min-h-screen bg-[#0a0a14] flex flex-col p-4" dir="rtl">
      {/* Header */}
      <div className="max-w-2xl w-full mx-auto mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-gray-400 text-sm">
            السؤال <span className="text-purple-300 font-bold">{currentQ + 1}</span> من {QUIZ_QUESTIONS.length}
          </span>
          <span className="text-gray-400 text-sm">
            أُجيب على <span className="text-green-400 font-bold">{answeredCount}</span> سؤال
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="max-w-2xl w-full mx-auto flex-1 flex flex-col justify-center">
        <div className="bg-[#1a1a2e] border border-purple-900/30 rounded-2xl p-6 md:p-8 space-y-6">
          {/* Question number badge */}
          <div className="flex items-start gap-3">
            <span className="bg-purple-600 text-white text-sm font-bold px-3 py-1 rounded-full shrink-0">
              {currentQ + 1}
            </span>
            <h2 className="text-white text-lg font-semibold leading-relaxed">{q.question}</h2>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {q.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => selectAnswer(idx)}
                className={`w-full text-right p-4 rounded-xl border transition-all duration-200 ${
                  selectedAnswer === idx
                    ? "bg-purple-600/20 border-purple-500 text-white"
                    : "bg-[#0d0d1a] border-purple-900/20 text-gray-300 hover:border-purple-500/40 hover:bg-purple-900/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedAnswer === idx ? "border-purple-400 bg-purple-500" : "border-gray-600"
                  }`}>
                    {selectedAnswer === idx && <span className="w-2 h-2 bg-white rounded-full" />}
                  </span>
                  <span>{option}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => setCurrentQ(q => Math.max(0, q - 1))}
              disabled={currentQ === 0}
              className="border-gray-600 text-gray-300 gap-2"
            >
              <ChevronRight className="w-4 h-4" />
              السابق
            </Button>

            {currentQ < QUIZ_QUESTIONS.length - 1 ? (
              <Button
                onClick={() => setCurrentQ(q => q + 1)}
                className="bg-purple-600 hover:bg-purple-700 gap-2"
              >
                التالي
                <ChevronLeft className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={submitQuiz.isPending || answeredCount < QUIZ_QUESTIONS.length}
                className="bg-green-600 hover:bg-green-700 gap-2"
              >
                {submitQuiz.isPending ? "جاري الإرسال..." : "إنهاء الاختبار"}
                <CheckCircle className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Question dots */}
        <div className="flex flex-wrap gap-2 justify-center mt-4">
          {QUIZ_QUESTIONS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentQ(i)}
              className={`w-7 h-7 rounded-full text-xs font-bold transition-all ${
                i === currentQ
                  ? "bg-purple-600 text-white scale-110"
                  : answers[i] !== -1
                  ? "bg-green-600/60 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
