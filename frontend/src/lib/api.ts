const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface Product {
  productUrl: string;
  currentPrice: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PricePoint {
  timestamp: string;
  price: number;
}

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch(`${API_BASE}/products`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

export async function addProduct(url: string): Promise<void> {
  const res = await fetch(`${API_BASE}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to add product");
  }
}

export async function deleteProduct(url: string): Promise<void> {
  const res = await fetch(
    `${API_BASE}/products/${encodeURIComponent(url)}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error("Failed to delete product");
}

export async function fetchHistory(url: string): Promise<PricePoint[]> {
  const res = await fetch(
    `${API_BASE}/products/${encodeURIComponent(url)}/history`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}
