"use client";

import Link from "next/link";
import { FaGithub } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="border-t border-gray-800 mt-12">
      <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-4">
          <span>
            Built by{" "}
            <a
              href="https://devrupt.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              devrupt.io
            </a>
          </span>
          <a
            href="https://github.com/devrupt-io/ethos"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-white transition-colors"
            aria-label="GitHub repository"
          >
            <FaGithub className="w-5 h-5" />
          </a>
        </div>
        <Link
          href="/admin"
          className="text-gray-600 hover:text-gray-400 transition-colors"
        >
          Admin
        </Link>
      </div>
    </footer>
  );
}
