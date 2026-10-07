import React, { useState, useEffect } from "react";
import GoogleTranslate from "./GoogleTranslate";
import Image from "next/image";
import { getSetting } from "@/lib/settingsService";

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showAdmissions, setShowAdmissions] = useState(false);

  // Fetch settings
  useEffect(() => {
    const fetchSettings = async () => {
      const resultsVisible = await getSetting("showResults", false);
      const admissionsVisible = await getSetting("showAdmissions", false);
      setShowResults(resultsVisible);
      setShowAdmissions(admissionsVisible);
    };
    fetchSettings();
  }, []);

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMenuOpen && !event.target.closest(".mobile-menu-container")) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <header className="bg-teal-800 text-white sticky top-0 z-50 shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center justify-between">
          {/* Logo Section */}
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-200 to-white rounded-xl flex items-center justify-center shadow-lg">
              <Image src={"/logo.png"} alt="Logo" width={48} height={48} />
            </div>
            <div>
              <span className="text-xl font-bold">DKJU</span>
              <p className="text-xs text-teal-100">Smart Islamic Education</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a
              href="/"
              className="hover:text-yellow-400 transition-colors relative group"
            >
              Home
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-yellow-400 transition-all group-hover:w-full"></span>
            </a>

            <a
              href="/about"
              className="hover:text-yellow-400 transition-colors relative group"
            >
              About
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-yellow-400 transition-all group-hover:w-full"></span>
            </a>

            {/* <a
              href="/smart-class"
              className="hover:text-yellow-400 transition-colors relative group"
            >
              Smart Class
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-yellow-400 transition-all group-hover:w-full"></span>
            </a> */}

            <a
              href="/events"
              className="hover:text-yellow-400 transition-colors relative group"
            >
              Events
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-yellow-400 transition-all group-hover:w-full"></span>
            </a>
            <a
              href="/leaders"
              className="hover:text-yellow-400 transition-colors relative group"
            >
              Leaders
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-yellow-400 transition-all group-hover:w-full"></span>
            </a>

            <a
              href="/contact"
              className="hover:text-yellow-400 transition-colors relative group"
            >
              Contact
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-yellow-400 transition-all group-hover:w-full"></span>
            </a>

            {showResults && (
              <a
                href="/results"
                className="hover:text-yellow-400 transition-colors relative group"
              >
                Results
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-yellow-400 transition-all group-hover:w-full"></span>
              </a>
            )}

            {showAdmissions && (
              <a
                href="/admission/form"
                className="bg-yellow-400 hover:bg-yellow-500 text-teal-800 px-4 py-2 rounded-lg font-semibold transition-all transform hover:scale-105"
              >
                Admission
              </a>
            )}
            {/* <div className="hidden md:flex items-center space-x-8">
              <GoogleTranslate />
            </div> */}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white focus:outline-none"
              aria-label="Toggle menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile Sidebar Menu */}
      <div
        className={`mobile-menu-container fixed inset-0 z-50 transform ${isMenuOpen ? "translate-x-0" : "-translate-x-full"} md:hidden transition-transform duration-300 ease-in-out`}
      >
        {/* Overlay */}
        {isMenuOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setIsMenuOpen(false)}
          ></div>
        )}

        {/* Sidebar */}
        <div className="fixed left-0 top-0 h-full w-64 bg-teal-800 shadow-xl overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b border-teal-700">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-200 to-white rounded-xl flex items-center justify-center shadow-lg">
                <Image src={"/logo.png"} alt="Logo" width={48} height={48} />
              </div>
              <span className="text-lg font-bold">DKJU</span>
            </div>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="text-white focus:outline-none"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <nav className="p-4 space-y-4">
            <a
              href="/"
              className="block px-4 py-3 rounded-lg hover:bg-teal-700 transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </a>
            <a
              href="/about"
              className="block px-4 py-3 rounded-lg hover:bg-teal-700 transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              About
            </a>
            <a
              href="/smart-class"
              className="block px-4 py-3 rounded-lg hover:bg-teal-700 transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Smart Class
            </a>
            <a
              href="/events"
              className="block px-4 py-3 rounded-lg hover:bg-teal-700 transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Events
            </a>
            <a
              href="/leaders"
              className="block px-4 py-3 rounded-lg hover:bg-teal-700 transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Leaders
            </a>
            <a
              href="/contact"
              className="block px-4 py-3 rounded-lg hover:bg-teal-700 transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Contact
            </a>
            {showResults && (
              <a
                href="/results"
                className="block px-4 py-3 rounded-lg hover:bg-teal-700 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Results
              </a>
            )}
            {showAdmissions && (
              <a
                href="/admission/form"
                className="block px-4 py-3 rounded-lg bg-yellow-400 text-teal-800 font-semibold hover:bg-yellow-500 transition-colors text-center"
                onClick={() => setIsMenuOpen(false)}
              >
                Admission
              </a>
            )}

            {/* <div className="pt-4 border-t border-teal-700">
              <GoogleTranslate />
            </div> */}
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Header;
