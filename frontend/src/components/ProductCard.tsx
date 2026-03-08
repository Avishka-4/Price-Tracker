"use client";

import { useState } from "react";
import type { Product, PricePoint } from "@/lib/api";
import { deleteProduct, fetchHistory } from "@/lib/api";

interface Props {
  product: Product;
  onDeleted: () => void;
}

export default function ProductCard({ product, onDeleted }: Props) {
  const [history, setHistory] = useState<PricePoint[] | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function toggleHistory() {
    if (!showHistory && history === null) {
      const data = await fetchHistory(product.productUrl);
      setHistory(data);
    }
    setShowHistory((v) => !v);
  }

  async function handleDelete() {
    if (!confirm("Remove this product from tracking?")) return;
    setDeleting(true);
    try {
      await deleteProduct(product.productUrl);
      onDeleted();
    } finally {
      setDeleting(false);
    }
  }

  const hostname = (() => {
    try {
      return new URL(product.productUrl).hostname;
    } catch {
      return product.productUrl;
    }
  })();

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-500 truncate">{hostname}</p>
          <a
            href={product.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-indigo-400 hover:underline break-all line-clamp-2"
          >
            {product.productUrl}
          </a>
        </div>
        <div className="text-right shrink-0">
          {product.currentPrice !== null ? (
            <span className="text-2xl font-bold text-emerald-400">
              ${product.currentPrice.toFixed(2)}
            </span>
          ) : (
            <span className="text-sm text-gray-500">Pending…</span>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span>Added {new Date(product.createdAt).toLocaleDateString()}</span>
        {product.updatedAt && (
          <span>
            Updated {new Date(product.updatedAt).toLocaleString()}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={toggleHistory}
          className="rounded-md border border-gray-700 px-3 py-1.5 text-xs
                     hover:bg-gray-800 transition-colors"
        >
          {showHistory ? "Hide History" : "Show History"}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-md border border-red-900 px-3 py-1.5 text-xs text-red-400
                     hover:bg-red-950 transition-colors disabled:opacity-50"
        >
          {deleting ? "Removing…" : "Remove"}
        </button>
      </div>

      {/* History table */}
      {showHistory && (
        <div className="mt-4 max-h-60 overflow-y-auto rounded-lg border border-gray-800">
          {history && history.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-gray-800 text-gray-400 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Date</th>
                  <th className="text-right px-3 py-2 font-medium">Price</th>
                </tr>
              </thead>
              <tbody>
                {history.map((point, i) => {
                  const prev = i > 0 ? history[i - 1].price : null;
                  const color =
                    prev === null
                      ? "text-gray-300"
                      : point.price < prev
                        ? "text-emerald-400"
                        : point.price > prev
                          ? "text-red-400"
                          : "text-gray-300";
                  return (
                    <tr key={point.timestamp} className="border-t border-gray-800">
                      <td className="px-3 py-2 text-gray-400">
                        {new Date(point.timestamp).toLocaleString()}
                      </td>
                      <td className={`px-3 py-2 text-right font-mono ${color}`}>
                        ${point.price.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="px-3 py-4 text-center text-gray-500 text-sm">
              No price history yet — data appears after the first scrape.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
