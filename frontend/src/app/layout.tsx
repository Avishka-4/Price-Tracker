import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Price Watcher",
  description: "Serverless product price tracker on AWS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 min-h-screen antialiased">
        <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
            <span className="text-2xl">📉</span>
            <h1 className="text-xl font-bold tracking-tight">Price Watcher</h1>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
