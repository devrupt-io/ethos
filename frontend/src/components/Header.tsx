"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { id: "/", label: "Dashboard" },
  { id: "/concepts", label: "Concepts" },
  { id: "/entities", label: "Entities" },
  { id: "/sentiment", label: "Sentiment" },
  { id: "/discourse", label: "Discourse" },
  { id: "/search", label: "Search" },
];

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (tabId: string) => {
    if (tabId === "/") return pathname === "/";
    return pathname.startsWith(tabId);
  };

  return (
    <header className="bg-gradient-to-r from-gray-900 to-gray-800 shadow-lg">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xl font-bold text-white tracking-tight hover:text-gray-200">
              ethos
            </Link>
            <span className="text-gray-400 text-xs hidden sm:inline border-l border-gray-600 pl-3">
              Exploring what HN is really thinking
            </span>
          </div>
          {/* Desktop nav */}
          <nav className="hidden md:flex gap-1">
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                href={tab.id}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  isActive(tab.id)
                    ? "bg-white text-gray-900"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-gray-300 hover:text-white"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
        </div>
        {/* Mobile menu */}
        {menuOpen && (
          <nav className="md:hidden mt-3 pt-3 border-t border-gray-700 flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                href={tab.id}
                onClick={() => setMenuOpen(false)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  isActive(tab.id)
                    ? "bg-white text-gray-900"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
