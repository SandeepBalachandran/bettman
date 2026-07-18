"use client";

import { useEffect, useState } from "react";
import { QuizModal } from "@/components/features/quiz/QuizModal";

export function QuizFab() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasPlayedToday, setHasPlayedToday] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkIfPlayedToday = async () => {
      try {
        const response = await fetch("/api/quiz/status");
        if (response.ok) {
          const data = await response.json();
          setHasPlayedToday(data.hasPlayedToday);
        }
      } catch (error) {
        console.error("Error checking quiz status:", error);
      } finally {
        setLoading(false);
      }
    };

    checkIfPlayedToday();
  }, [isOpen]);

  if (loading) return null;

  // Show checkmark after playing today
  if (hasPlayedToday) {
    return (
      <div
        className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-white text-2xl shadow-lg hover:shadow-xl hover:from-yellow-500 hover:to-yellow-700 flex items-center justify-center transition-all"
        title="Quiz already completed today. Come back tomorrow!"
      >
        <span>✓</span>
      </div>
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

      <QuizModal isOpen={isOpen} onClose={() => {
        setIsOpen(false);
        setHasPlayedToday(true);
      }} />
    </>
  );
}
