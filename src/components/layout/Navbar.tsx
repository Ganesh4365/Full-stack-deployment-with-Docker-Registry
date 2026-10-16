import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const navLinks = [
    { name: "Home", to: "/" },
    { name: "Services", to: "/services" },
    { name: "About", to: "/about" },
  ];

  return (
    <header className={`fixed top-0 left-0 right-0 z-[100] flex flex-col items-center pointer-events-none transition-all duration-300 ${isScrolled ? "px-3 sm:px-6 pt-3" : "px-0 pt-0"}`}>
      <nav 
        className={`pointer-events-auto w-full transition-all duration-300 ease-out backdrop-blur-xl flex flex-col justify-center ${
          isScrolled 
            ? "max-w-7xl rounded-full bg-white/90 border border-slate-200/80 shadow-lg shadow-indigo-950/5 h-16 px-4 sm:px-6" 
            : "max-w-[4000px] rounded-none bg-white/80 border-b border-slate-200/60 shadow-xs h-20 px-6 sm:px-8"
        }`}
      >
        <div className="w-full max-w-7xl mx-auto flex justify-between items-center h-full">
          {/* Logo */}
          <Link to="/" onClick={closeMobileMenu} className="flex items-center gap-2.5 relative z-50 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-extrabold text-sm shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform">
              N
            </div>
            <span className="font-display-md text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight text-slate-900">
              IronStack  <span className="text-indigo-600 font-semibold">Systems</span>
            </span>
          </Link>
          
          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link 
                  key={link.name}
                  to={link.to} 
                  className={`font-semibold text-sm xl:text-base px-4 py-2 rounded-full transition-all ${
                    isActive 
                      ? "text-indigo-600 bg-indigo-50/80" 
                      : "text-slate-600 hover:text-indigo-600 hover:bg-slate-50"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
            <Link
              to="/start-project"
              className="inline-flex items-center justify-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm xl:text-base font-bold rounded-full transition-all duration-300 shadow-md shadow-indigo-600/25 hover:shadow-lg hover:shadow-indigo-600/35 hover:-translate-y-0.5 ml-3 whitespace-nowrap"
            >
              Start a Project
            </Link>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button 
            className="lg:hidden p-2 text-slate-700 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors relative z-50 flex items-center justify-center active:scale-95"
            onClick={toggleMobileMenu}
            aria-label="Toggle Menu"
          >
            <span className="material-symbols-outlined text-[26px]">
              {isMobileMenuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile Nav Dropdown (Direct Header Extension) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className={`pointer-events-auto w-full overflow-hidden lg:hidden ${
              isScrolled 
                ? "max-w-7xl mt-2 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-xl" 
                : "max-w-[4000px] bg-white/95 backdrop-blur-xl border-b border-slate-200/70 shadow-md"
            }`}
          >
            <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-1">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.name}
                    to={link.to}
                    onClick={closeMobileMenu}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-base font-semibold transition-all ${
                      isActive
                        ? "text-indigo-600 bg-indigo-50/90 font-bold"
                        : "text-slate-700 hover:text-indigo-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>{link.name}</span>
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    )}
                  </Link>
                );
              })}
              
              <div className="pt-3 mt-1 border-t border-slate-100">
                <Link
                  to="/start-project"
                  onClick={closeMobileMenu}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-600/20 active:scale-[0.99] transition-all"
                >
                  <span>Start a Project</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}


