"use client";

import { useState } from "react";

interface QuizQuestionFormProps {
  onQuestionAdded?: () => void;
}

export function QuizQuestionForm({ onQuestionAdded }: QuizQuestionFormProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (!question.trim()) {
      setMessage("✗ Question text required");
      return;
    }

    if (options.some(o => !o.trim())) {
      setMessage("✗ All 4 options required");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/admin/quiz-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          options: options.map(o => o.trim()),
          correctIndex,
          difficulty,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add question");
      }

      setMessage("✓ Question added successfully");
      setQuestion("");
      setOptions(["", "", "", ""]);
      setCorrectIndex(0);
      setDifficulty("MEDIUM");

      if (onQuestionAdded) {
        onQuestionAdded();
      }

      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("✗ Failed to add question");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 p-4">
      <h3 className="font-semibold">Add New Question</h3>

      <div>
        <label className="text-sm font-medium">Question</label>
        <textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Enter question text"
          className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 px-2 py-1 bg-white dark:bg-white/5 min-h-20"
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Options</label>
        <div className="space-y-2">
          {options.map((option, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="radio"
                name="correct"
                checked={correctIndex === idx}
                onChange={() => setCorrectIndex(idx)}
                className="w-4 h-4"
              />
              <input
                type="text"
                value={option}
                onChange={e => handleOptionChange(idx, e.target.value)}
                placeholder={`Option ${idx + 1}`}
                className="flex-1 rounded border border-gray-300 dark:border-gray-600 px-2 py-1 bg-white dark:bg-white/5"
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Difficulty</label>
        <select
          value={difficulty}
          onChange={e => setDifficulty(e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 px-2 py-1 bg-white dark:bg-white/5"
        >
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-accent py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
      >
        {loading ? "Adding..." : "Add Question"}
      </button>

      {message && (
        <p className={`text-sm ${message.startsWith("✓") ? "text-success" : "text-danger"}`}>
          {message}
        </p>
      )}
    </form>
  );
}
