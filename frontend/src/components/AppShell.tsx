"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 flex-1 w-full">
        {children}
      </main>
      <Footer />
    </div>
  );
}
