"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

interface BoosterActivatedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BoosterActivatedModal({ isOpen, onClose }: BoosterActivatedModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Trigger confetti explosion
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#FFD700", "#FFA500", "#FF8C00", "#FFB347"],
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 shadow-2xl p-6 sm:p-8 space-y-4 sm:space-y-6 animate-bounce">
        <div className="text-center space-y-2 sm:space-y-3">
          <div className="text-4xl sm:text-5xl mb-2">⚡</div>
          <h2 className="text-xl sm:text-2xl font-bold gradient-text">
            2x Booster Activated!
          </h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Points you win on this match will be doubled
          </p>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 sm:p-4 border border-amber-200 dark:border-amber-800">
          <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300 font-semibold">
            💡 Tip: Correct picks on this match earn 2x points. Lost points aren't doubled.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 sm:py-4 px-4 rounded-lg bg-accent text-white font-semibold hover:bg-accent/90 transition-colors text-sm sm:text-base touch-none"
        >
          Oh Yeah! 🎉
        </button>
      </div>
    </div>
  );
}
