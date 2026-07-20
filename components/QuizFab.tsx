"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { QuizModal } from "@/components/features/quiz/QuizModal";

interface QuizConfig {
  questionsPerQuiz: number;
  secondsPerQuestion: number;
  completionCoins: number;
  coinsPerCorrect: number;
}

interface QuizAnswer {
  questionId: string;
  question: string;
  options: string[];
  selectedIndex: number | null;
  correctIndex: number;
  isCorrect: boolean;
}

interface QuizResults {
  correctCount: number;
  coinsAwarded: number;
  newBalance: number;
  detailedAnswers?: QuizAnswer[];
}

export function QuizFab() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [hasPlayedToday, setHasPlayedToday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quizConfig, setQuizConfig] = useState<QuizConfig | null>(null);
  const [lastResults, setLastResults] = useState<QuizResults | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [featureEnabled, setFeatureEnabled] = useState(true);

  useEffect(() => {
    if (!session) return;

    const initializeQuiz = async () => {
      try {
        // Feature flag check — bail out early if quiz is disabled
        const flagsRes = await fetch("/api/feature-flags");
        if (flagsRes.ok) {
          const flags = await flagsRes.json();
          if (flags.quiz === false) {
            setFeatureEnabled(false);
            setLoading(false);
            return;
          }
        }

        // Fetch quiz status and config in parallel
        const [statusRes, configRes] = await Promise.all([
          fetch("/api/quiz/status"),
          fetch("/api/quiz/config"),
        ]);

        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setHasPlayedToday(statusData.hasPlayedToday);

          // If played today, fetch the results
          if (statusData.hasPlayedToday) {
            const resultsRes = await fetch("/api/quiz/results");
            if (resultsRes.ok) {
              const resultsData = await resultsRes.json();
              setLastResults(resultsData);
            }
          }
        }

        if (configRes.ok) {
          const configData = await configRes.json();
          setQuizConfig(configData);
        }
      } catch (error) {
        console.error("Error initializing quiz:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeQuiz();
  }, [session]);

  if (!session || loading || !featureEnabled) return null;

  // Show checkmark after playing today
  if (hasPlayedToday) {
    console.log("Has played today - showResults:", showResults, "lastResults:", lastResults);
    return (
      <>
        <button
          onClick={() => {
            console.log("Checkmark clicked - setting showResults to true");
            setShowResults(true);
          }}
          className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-white text-2xl shadow-lg hover:shadow-xl hover:from-yellow-500 hover:to-yellow-700 flex items-center justify-center transition-all cursor-pointer active:scale-95"
          title="Click to view today's quiz results"
        >
          <span>✓</span>
        </button>
        {showResults && lastResults && (
          <ResultsSummary results={lastResults} onClose={() => setShowResults(false)} />
        )}
        {showResults && !lastResults && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-600/40 backdrop-blur-sm p-4">
            <div className="card rounded-2xl p-4 sm:p-6 w-full max-w-md space-y-4 text-center">
              <p className="text-sm text-gray-600">Results not available. Complete a quiz first.</p>
              <button
                onClick={() => setShowResults(false)}
                className="w-full py-2 rounded-lg bg-accent text-white text-xs sm:text-sm font-medium hover:bg-accent/90"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <style>{`
        @keyframes spin-quiz {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .quiz-fab-icon {
          animation: spin-quiz 4s linear infinite;
        }
        .quiz-fab-icon:hover {
          animation-duration: 1s;
        }
      `}</style>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-accent hover:bg-accent/90 text-white text-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
        title="Daily Quiz"
      >
        <span className="quiz-fab-icon inline-block">⚽</span>
      </button>

      <QuizModal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
        }}
        onQuizCompleted={(results) => {
          setHasPlayedToday(true);
          setLastResults({
            correctCount: results.correctCount,
            coinsAwarded: results.coinsAwarded,
            newBalance: results.newBalance,
            detailedAnswers: results.answers,
          });
          setIsOpen(false);
          setShowResults(true);
        }}
        initialConfig={quizConfig}
      />
    </>
  );
}

function ResultsSummary({ results, onClose }: { readonly results: QuizResults; readonly onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-600/40 backdrop-blur-sm p-4 sm:p-0">
      <div className="card rounded-2xl p-3 sm:p-5 w-full max-w-sm sm:max-w-md space-y-2.5 sm:space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="text-center">
          <p className="text-2xl sm:text-4xl mb-1">✓</p>
          <h3 className="text-base sm:text-lg font-bold mb-1">Quiz Completed Today</h3>
          <p className="text-[11px] sm:text-sm text-gray-600 dark:text-gray-400">
            Great job! Here's your summary.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          <div className="p-2 sm:p-3 bg-success/10 rounded-lg text-center">
            <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">Coins</p>
            <p className="text-sm sm:text-lg font-bold text-success">+{results.coinsAwarded}</p>
          </div>
          <div className="p-2 sm:p-3 bg-accent/10 rounded-lg text-center">
            <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">Balance</p>
            <p className="text-sm sm:text-lg font-bold text-accent">{results.newBalance}</p>
          </div>
          <div className="p-2 sm:p-3 bg-highlight/10 rounded-lg text-center">
            <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">Correct</p>
            <p className="text-sm sm:text-lg font-bold text-highlight-foreground dark:text-highlight">{results.correctCount}</p>
          </div>
        </div>

        {results.detailedAnswers && results.detailedAnswers.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-2.5 space-y-1.5">
            <p className="text-[10px] sm:text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Answer Breakdown</p>
            <div className="space-y-1.5 max-h-44 sm:max-h-52 overflow-y-auto">
              {results.detailedAnswers.map((answer, idx) => (
                <div
                  key={answer.questionId}
                  className={`p-1.5 sm:p-2 rounded border-l-4 ${
                    answer.isCorrect
                      ? "bg-success/10 border-success"
                      : "bg-danger/10 border-danger"
                  }`}
                >
                  <p className="font-semibold text-[11px] sm:text-xs mb-0.5">Q{idx + 1}. {answer.isCorrect ? "✓" : "✗"} <span className="font-normal text-gray-700 dark:text-gray-300">{answer.question}</span></p>
                  <div className="space-y-0.5 text-[10px] sm:text-xs">
                    {answer.selectedIndex !== null && answer.selectedIndex >= 0 ? (
                      <p className="text-gray-600 dark:text-gray-400">
                        Your answer:{" "}
                        <span className={answer.isCorrect ? "text-success font-semibold" : "text-danger font-semibold"}>
                          {answer.options[answer.selectedIndex]}
                        </span>
                      </p>
                    ) : (
                      <p className="text-gray-600 dark:text-gray-400">
                        Your answer: <span className="text-danger font-semibold">Not answered</span>
                      </p>
                    )}
                    {!answer.isCorrect && (
                      <p className="text-gray-600 dark:text-gray-400">
                        Correct:{" "}
                        <span className="text-success font-semibold">
                          {answer.options[answer.correctIndex]}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1.5 border-t border-gray-200 dark:border-gray-700 pt-2.5">
          <p className="text-[10px] sm:text-xs text-center text-gray-600 dark:text-gray-400 leading-relaxed">
            📅 Next quiz will be available tomorrow at midnight UTC
          </p>
          <button
            onClick={onClose}
            className="w-full py-2 sm:py-2.5 rounded-lg bg-accent text-white text-xs sm:text-sm font-medium hover:bg-accent/90 transition-colors active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
