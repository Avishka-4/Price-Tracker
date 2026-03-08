"use client";

import { useState } from "react";
import { addProduct } from "@/lib/api";

interface Props {
  onAdded: () => void;
}

export default function AddUrlForm({ onAdded }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      new URL(url);
    } catch {
      setError("Please enter a valid URL");
      return;
    }

    setLoading(true);
    try {
      await addProduct(url);
      setUrl("");
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
      <input
        type="url"
        required
        placeholder="https://www.amazon.com/dp/..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5
                   text-sm placeholder-gray-500 focus:border-indigo-500 focus:outline-none
                   focus:ring-1 focus:ring-indigo-500"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium
                   hover:bg-indigo-500 disabled:opacity-50 transition-colors"
      >
        {loading ? "Adding…" : "Track URL"}
      </button>
      {error && <p className="text-red-400 text-sm self-center">{error}</p>}
    </form>
  );
}
