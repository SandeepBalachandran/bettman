"use client";

import { useState } from "react";

interface QuizConfigFormProps {
  initialConfig: {
    questionsPerQuiz: number;
    secondsPerQuestion: number;
    completionCoins: number;
    coinsPerCorrect: number;
  };
}

export function QuizConfigForm({ initialConfig }: QuizConfigFormProps) {
  const [config, setConfig] = useState(initialConfig);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (field: keyof typeof config, value: number) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/quiz-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error("Failed to update config");
      }

      setMessage("✓ Config updated successfully");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("✗ Failed to update config");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 p-4">
      <h3 className="font-semibold">Quiz Configuration</h3>

      <div>
        <label className="text-sm font-medium">Questions per quiz</label>
        <input
          type="number"
          min="1"
          max="20"
          value={config.questionsPerQuiz}
          onChange={e => handleChange("questionsPerQuiz", parseInt(e.target.value))}
          className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 px-2 py-1 bg-white dark:bg-white/5"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Seconds per question</label>
        <input
          type="number"
          min="5"
          max="60"
          value={config.secondsPerQuestion}
          onChange={e => handleChange("secondsPerQuestion", parseInt(e.target.value))}
          className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 px-2 py-1 bg-white dark:bg-white/5"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Completion coins (base)</label>
        <input
          type="number"
          min="0"
          value={config.completionCoins}
          onChange={e => handleChange("completionCoins", parseInt(e.target.value))}
          className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 px-2 py-1 bg-white dark:bg-white/5"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Coins per correct answer</label>
        <input
          type="number"
          min="0"
          value={config.coinsPerCorrect}
          onChange={e => handleChange("coinsPerCorrect", parseInt(e.target.value))}
          className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 px-2 py-1 bg-white dark:bg-white/5"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-accent py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save Config"}
      </button>

      {message && (
        <p className={`text-sm ${message.startsWith("✓") ? "text-success" : "text-danger"}`}>
          {message}
        </p>
      )}
    </form>
  );
}
