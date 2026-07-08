"use client";

import { useEffect, useState } from "react";

interface RewardSuccessModalProps {
  isOpen: boolean;
  coins: number;
  onClose: () => void;
}

export function RewardSuccessModal({
  isOpen,
  coins,
  onClose,
}: RewardSuccessModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
        {/* Modal */}
        <div className="animate-in zoom-in-50 duration-300 relative">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 sm:p-12 text-center shadow-2xl max-w-sm w-full">
            {/* Checkmark Animation */}
            <div className="mb-6 flex justify-center">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                <svg
                  className="w-full h-full animate-pulse"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-success"
                  />
                </svg>

                {/* Animated Checkmark */}
                <svg
                  className="absolute inset-0 w-full h-full animate-in fade-in duration-500"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M 30 50 L 45 65 L 75 35"
                    stroke="currentColor"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-success"
                    style={{
                      strokeDasharray: 100,
                      strokeDashoffset: showConfetti ? 0 : 100,
                      transition: "stroke-dashoffset 0.6s ease-out 0.2s",
                    }}
                  />
                </svg>
              </div>
            </div>

            {/* Text */}
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Reward Claimed!
            </h2>

            <div className="mb-6 space-y-2">
              <p className="text-4xl sm:text-5xl font-bold text-yellow-500 animate-in bounce-in duration-500">
                +{coins} 💰
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                Great job! Come back tomorrow for more
              </p>
            </div>

            {/* Celebration particles */}
            {showConfetti && (
              <>
                <div className="absolute top-4 left-1/4 text-2xl animate-in fade-out slide-out-to-top duration-1000">
                  ⭐
                </div>
                <div className="absolute top-6 right-1/4 text-2xl animate-in fade-out slide-out-to-top duration-1000">
                  ✨
                </div>
                <div className="absolute top-8 left-1/3 text-xl animate-in fade-out slide-out-to-top duration-1000">
                  🎉
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
