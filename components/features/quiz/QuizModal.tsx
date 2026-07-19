"use client";

import { useEffect, useState } from "react";
import { SkeletonLine, SkeletonButton, SkeletonCard } from "@/components/SkeletonLoader";
import confetti from "canvas-confetti";

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  difficulty: string;
}

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

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuizCompleted?: (results: { correctCount: number; coinsAwarded: number; newBalance: number; answers?: QuizAnswer[] }) => void;
  initialConfig?: QuizConfig | null;
}

type QuizState = "preview" | "loading" | "quiz" | "results" | "error";

export function QuizModal({ isOpen, onClose, onQuizCompleted, initialConfig }: QuizModalProps) {
  const [state, setState] = useState<QuizState>("preview");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [config, setConfig] = useState<QuizConfig | null>(initialConfig || null);
  const [secondsPerQuestion, setSecondsPerQuestion] = useState(10);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [answeredInTime, setAnsweredInTime] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<{ correctCount: number; coinsAwarded: number; newBalance: number; answers: QuizAnswer[] } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  // Hide background when modal opens
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Show preview immediately when modal opens (config already fetched)
  useEffect(() => {
    if (isOpen) {
      setState("preview");
    }
  }, [isOpen]);

  // Load actual quiz when user clicks "Start Quiz"
  const startQuiz = async () => {
    try {
      setState("loading");
      setError("");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch("/api/quiz/today", { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to load quiz (${response.status})`);
      }

      const data = await response.json();
      console.log("Quiz data received:", data);

      if (!data.questions || data.questions.length === 0) {
        throw new Error("No quiz questions available");
      }

      setQuestions(data.questions);
      setSecondsPerQuestion(data.secondsPerQuestion);
      setTimeRemaining(data.secondsPerQuestion);

      // Initialize answers
      const initialAnswers: Record<string, number | null> = {};
      const initialTiming: Record<string, boolean> = {};
      data.questions.forEach((q: QuizQuestion) => {
        initialAnswers[q.id] = null;
        initialTiming[q.id] = false;
      });
      setAnswers(initialAnswers);
      setAnsweredInTime(initialTiming);

      setCurrentQuestionIndex(0);
      setState("quiz");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to load quiz";
      console.error("Error loading quiz:", errorMsg);
      setError(errorMsg);
      setState("error");
    }
  };

  // Timer effect
  useEffect(() => {
    if (state !== "quiz" || timeRemaining <= 0) return;

    const timer = setTimeout(() => {
      setTimeRemaining(timeRemaining - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [state, timeRemaining]);

  // Auto-advance when time runs out
  useEffect(() => {
    if (state !== "quiz" || timeRemaining > 0 || submitting) return;

    const currentQuestion = questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === questions.length - 1;

    // Mark as timed out
    setAnsweredInTime(prev => ({ ...prev, [currentQuestion.id]: false }));

    // Move to next question or submit
    if (isLastQuestion) {
      submitQuiz();
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setTimeRemaining(secondsPerQuestion);
    }
  }, [state, timeRemaining, currentQuestionIndex, questions, secondsPerQuestion, submitting]);

  // Trigger confetti when quiz is completed
  useEffect(() => {
    if (state === "results" && results) {
      // Trigger confetti with celebration
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4'],
      });

      // Add a second burst for extra celebration
      setTimeout(() => {
        confetti({
          particleCount: 50,
          spread: 100,
          origin: { y: 0.3 },
          colors: ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4'],
        });
      }, 200);
    }
  }, [state, results]);

  const handleSelectOption = (optionIndex: number) => {
    const currentQuestion = questions[currentQuestionIndex];
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: optionIndex }));
    setAnsweredInTime(prev => ({ ...prev, [currentQuestion.id]: true }));

    const isLastQuestion = currentQuestionIndex === questions.length - 1;

    // Auto-advance after brief delay, unless it's the last question
    setTimeout(() => {
      if (isLastQuestion) {
        submitQuiz();
      } else {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setTimeRemaining(secondsPerQuestion);
      }
    }, isLastQuestion ? 0 : 300);
  };

  const submitQuiz = async () => {
    if (submitting || questions.length === 0) return;
    setSubmitting(true);

    try {
      const quizAnswers = questions.map(q => ({
        questionId: q.id,
        selectedIndex: answers[q.id] ?? -1,
        answeredInTime: answeredInTime[q.id] ?? false,
      }));

      const response = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: quizAnswers }),
      });

      if (!response.ok) throw new Error("Failed to submit quiz");

      const data = await response.json();

      const quizResults = {
        correctCount: data.correctCount,
        coinsAwarded: data.coinsAwarded,
        newBalance: data.newBalance,
        answers: data.detailedAnswers,
      };
      setResults(quizResults);
      setState("results");
      onQuizCompleted?.({
        correctCount: data.correctCount,
        coinsAwarded: data.coinsAwarded,
        newBalance: data.newBalance,
        answers: data.detailedAnswers,
      });
    } catch (error) {
      console.error("Error submitting quiz:", error);
      setError(error instanceof Error ? error.message : "Failed to submit quiz");
      setState("error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Preview screen - show quiz details before starting
  if (state === "preview") {
    const totalCoins = config
      ? config.completionCoins + config.questionsPerQuiz * config.coinsPerCorrect
      : 0;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-600/40 backdrop-blur-sm p-4 sm:p-0">
        <div className="card rounded-2xl p-3 sm:p-5 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
          <div className="text-center">
            <p className="text-3xl sm:text-4xl mb-2">⚽</p>
            <h3 className="text-lg sm:text-xl font-bold mb-1">Daily Football Quiz</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Test your football knowledge and earn coins!
            </p>
          </div>

          {config && (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 sm:p-3 bg-accent/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-lg sm:text-xl">❓</span>
                  <span className="text-xs sm:text-sm font-medium">Questions</span>
                </div>
                <span className="text-base sm:text-lg font-bold text-accent">{config.questionsPerQuiz}</span>
              </div>

              <div className="flex items-center justify-between p-2 sm:p-3 bg-highlight/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-lg sm:text-xl">⏱️</span>
                  <span className="text-xs sm:text-sm font-medium">Time per question</span>
                </div>
                <span className="text-base sm:text-lg font-bold text-highlight-foreground dark:text-highlight">
                  {config.secondsPerQuestion}s
                </span>
              </div>

              <div className="flex items-center justify-between p-2 sm:p-3 bg-success/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-lg sm:text-xl">💰</span>
                  <span className="text-xs sm:text-sm font-medium">Per correct answer</span>
                </div>
                <span className="text-base sm:text-lg font-bold text-success">+{config.coinsPerCorrect}</span>
              </div>

              <div className="flex items-center justify-between p-2 sm:p-3 bg-success/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-lg sm:text-xl">🎁</span>
                  <span className="text-xs sm:text-sm font-medium">Completion bonus</span>
                </div>
                <span className="text-base sm:text-lg font-bold text-success">+{config.completionCoins}</span>
              </div>

              <div className="flex items-center justify-between p-2 sm:p-3 bg-success/10 rounded-lg border-2 border-success">
                <div className="flex items-center gap-2">
                  <span className="text-lg sm:text-xl">🏆</span>
                  <span className="text-xs sm:text-sm font-medium">Max coins possible</span>
                </div>
                <span className="text-base sm:text-lg font-bold text-success">{totalCoins}</span>
              </div>
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <p className="flex items-start gap-1.5">
                <span className="text-xs mt-0.5">ℹ️</span>
                <span className="text-xs leading-tight">You can close and restart the quiz at anytime. Once completed, you can only retake the quiz next day.</span>
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <button
              onClick={startQuiz}
              className="w-full py-2.5 rounded-lg bg-accent text-white text-xs sm:text-sm font-medium hover:bg-accent/90 transition-colors active:scale-95"
            >
              Start Quiz
            </button>
            <button
              onClick={onClose}
              className="w-full py-2 text-xs text-gray-500 hover:text-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-600/40 backdrop-blur-sm p-4">
        <div className="card rounded-2xl p-4 sm:p-6 w-full max-w-md space-y-4">
          <div className="text-center">
            <p className="text-3xl sm:text-4xl mb-2">⚠️</p>
            <h3 className="text-lg sm:text-xl font-bold mb-2">Quiz Error</h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-4 break-words">{error}</p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-2 sm:py-3 rounded-lg bg-accent text-white text-xs sm:text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-600/40 backdrop-blur-sm p-4">
        <SkeletonCard className="max-h-[90vh] overflow-y-auto w-full sm:w-96">
          {/* Progress bar skeleton */}
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-2">
              <SkeletonLine width="w-24" height="h-3" />
              <SkeletonLine width="w-12" height="h-3" />
            </div>
            <SkeletonLine height="h-2" />
          </div>

          {/* Question text skeleton */}
          <div className="space-y-3">
            <SkeletonLine height="h-4" width="w-5/6" />
            <SkeletonLine height="h-4" width="w-4/6" />
          </div>

          {/* Options skeletons */}
          <div className="space-y-2">
            <SkeletonButton />
            <SkeletonButton />
            <SkeletonButton />
            <SkeletonButton />
          </div>

          {/* Close button skeleton */}
          <SkeletonButton className="mt-4" />
        </SkeletonCard>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  if (state === "quiz") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-600/40 backdrop-blur-sm p-4 sm:p-0">
        <div className="card rounded-2xl p-4 sm:p-6 w-full max-w-md space-y-4 sm:space-y-6 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
          {/* Progress */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs sm:text-sm font-medium text-gray-500">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
              <p className={`text-sm sm:text-base font-bold ${timeRemaining <= 3 ? 'text-danger' : 'text-accent'}`}>
                {timeRemaining}s
              </p>
            </div>
            <div className="w-full h-2 sm:h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div>
            <p className="text-sm sm:text-base font-semibold mb-4 leading-relaxed">{currentQuestion.question}</p>

            {/* Options */}
            <div className="space-y-2 sm:space-y-3">
              {currentQuestion.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  className={`w-full text-left p-3 sm:p-4 rounded-lg border-2 transition-colors active:scale-95 ${
                    answers[currentQuestion.id] === idx
                      ? 'border-accent bg-accent/10'
                      : 'border-gray-200 dark:border-gray-700 hover:border-accent/50'
                  }`}
                >
                  <p className="text-xs sm:text-sm break-words">{option}</p>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2 sm:py-2.5 text-xs sm:text-sm text-gray-500 hover:text-gray-600 transition-colors"
          >
            Close
          </button>

          {submitting && (
            <div className="absolute inset-0 rounded-2xl bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Submitting...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (state === "results" && results) {
    const totalCorrect = results.correctCount;
    const totalQuestions = questions.length;
    const totalWrong = totalQuestions - totalCorrect;
    const percentage = Math.round((totalCorrect / totalQuestions) * 100);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-600/40 backdrop-blur-sm p-4 sm:p-0">
        <div className="card rounded-2xl p-4 sm:p-6 w-full max-w-md space-y-4 sm:space-y-6 max-h-[95vh] overflow-y-auto">
          <div className="text-center">
            <p className="text-3xl sm:text-5xl mb-2">
              {percentage >= 80 ? '🎉' : percentage >= 60 ? '👍' : '💪'}
            </p>
            <h3 className="text-xl sm:text-2xl font-bold mb-4">Quiz Complete!</h3>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="p-2 bg-success/10 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400">Correct</p>
                <p className="text-lg font-bold text-success">{totalCorrect}</p>
              </div>
              <div className="p-2 bg-danger/10 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400">Wrong</p>
                <p className="text-lg font-bold text-danger">{totalWrong}</p>
              </div>
              <div className="p-2 bg-accent/10 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400">Score</p>
                <p className="text-lg font-bold text-accent">{percentage}%</p>
              </div>
            </div>
          </div>

          <div className="space-y-2 sm:space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex justify-between items-center p-3 sm:p-4 bg-success/10 rounded-lg">
              <p className="text-xs sm:text-sm font-medium">Coins Earned</p>
              <p className="text-lg sm:text-xl font-bold text-success">+{results.coinsAwarded}</p>
            </div>
            <div className="flex justify-between items-center p-3 sm:p-4 bg-accent/10 rounded-lg">
              <p className="text-xs sm:text-sm font-medium">New Balance</p>
              <p className="text-base sm:text-lg font-bold text-accent">{results.newBalance}</p>
            </div>
          </div>

          {results.answers && results.answers.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Answer Breakdown</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {results.answers.map((answer, idx) => (
                  <div
                    key={answer.questionId}
                    className={`p-2 rounded border-l-4 text-xs ${
                      answer.isCorrect
                        ? "bg-success/10 border-success"
                        : "bg-danger/10 border-danger"
                    }`}
                  >
                    <p className="font-semibold text-xs mb-1">Q{idx + 1}. {answer.isCorrect ? "✓" : "✗"}</p>
                    <p className="text-xs text-gray-700 dark:text-gray-300 mb-1">{answer.question}</p>
                    <div className="space-y-0.5 text-xs">
                      {answer.selectedIndex !== null && (
                        <p className="text-gray-600 dark:text-gray-400">
                          Your answer: <span className={answer.isCorrect ? "text-success font-semibold" : "text-danger font-semibold"}>
                            {answer.options[answer.selectedIndex]}
                          </span>
                        </p>
                      )}
                      {!answer.isCorrect && (
                        <p className="text-gray-600 dark:text-gray-400">
                          Correct: <span className="text-success font-semibold">
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

          <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-4">
            <button
              onClick={onClose}
              className="w-full py-2 sm:py-3 rounded-lg bg-accent text-white text-xs sm:text-sm font-medium hover:bg-accent/90 transition-colors active:scale-95"
            >
              Close
            </button>
            <p className="text-xs sm:text-xs text-center text-gray-500">
              Come back tomorrow for a new quiz!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
