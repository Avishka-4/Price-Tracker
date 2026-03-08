"use client";

import { useCallback, useEffect, useState } from "react";
import AddUrlForm from "@/components/AddUrlForm";
import ProductCard from "@/components/ProductCard";
import { fetchProducts, type Product } from "@/lib/api";

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchProducts();
      setProducts(data);
    } catch (err) {
      console.error("Failed to load products", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-8">
      {/* Add URL section */}
      <section className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-lg font-semibold mb-4">Add a Product URL</h2>
        <AddUrlForm onAdded={load} />
      </section>

      {/* Products list */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Tracked Products{" "}
            <span className="text-gray-500 font-normal">
              ({products.length})
            </span>
          </h2>
          <button
            onClick={load}
            disabled={loading}
            className="rounded-md border border-gray-700 px-3 py-1.5 text-xs
                       hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {loading && products.length === 0 ? (
          <p className="text-gray-500 text-sm">Loading…</p>
        ) : products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-700 p-12 text-center">
            <p className="text-gray-400">
              No products tracked yet. Add a URL above to get started.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {products.map((p) => (
              <ProductCard key={p.productUrl} product={p} onDeleted={load} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
