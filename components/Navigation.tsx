"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { name: "Home", href: "/" },
  { name: "Basismodule", href: "/basismodule" },
  { name: "Analyse", href: "/analyse", disabled: true }, // Toekomstig
  { name: "Instellingen", href: "/instellingen", disabled: true }, // Toekomstig
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <>
      {/* --- DESKTOP NAVIGATION (Bovenzijde / Tab-stijl) --- */}
      <header className="hidden md:flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="font-bold text-lg tracking-wide">Kennissysteem</span>
        </div>
        <nav className="flex space-x-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            if (item.disabled) {
              return (
                <span
                  key={item.href}
                  className="px-4 py-2 text-sm text-slate-500 cursor-not-allowed"
                >
                  {item.name}
                </span>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? "bg-slate-800 text-emerald-400 border border-slate-700"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* --- MOBIELE NAVIGATION (Onderzijde Fixed Bar) --- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex justify-around p-2 z-50">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          if (item.disabled) return null; // Verberg niet-actieve items op mobiel om ruimte te besparen
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-1 px-3 rounded-md text-xs font-medium ${
                isActive ? "text-emerald-400 font-bold" : "text-slate-400"
              }`}
            >
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}