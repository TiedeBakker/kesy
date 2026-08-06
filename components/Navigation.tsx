"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";

interface NavSubItem {
  name: string;
  href: string;
}

interface NavItem {
  name: string;
  href?: string;
  disabled?: boolean;
  children?: NavSubItem[];
}

const navItems: NavItem[] = [
  { name: "Home", href: "/" },
  { name: "Basismodule", href: "/basismodule" },
  {
    name: "Invoermodule",
    children: [
      { name: "Parameter Invoer", href: "/invoermodule/parameter-invoer" },
      { name: "Quick Add (Sneltoevoegen)", href: "/invoermodule/quick-add" },
    ],
  },
  {
    name: "Beheer",
    children: [
      { name: "Parameter Sets", href: "/beheer/parameter-sets" },
      { name: "Taxonomie (COL)", href: "/beheer/taxonomie" },
    ],
  },
  { name: "Analyse", href: "/analyse", disabled: true },
  { name: "Instellingen", href: "/instellingen", disabled: true },
];

export default function Navigation() {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sluit dropdown bij klik buiten de navigatie
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Check of de huidige route onder een hoofdgroep valt
  const isChildActive = (children?: NavSubItem[]) => {
    return children?.some((sub) => pathname.startsWith(sub.href));
  };

  return (
    <>
      {/* --- DESKTOP NAVIGATION --- */}
      <header className="hidden md:flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800 relative z-50">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="font-bold text-lg tracking-wide">Kennissysteem</span>
        </div>

        <nav className="flex space-x-1" ref={dropdownRef}>
          {navItems.map((item) => {
            // Disabled item
            if (item.disabled) {
              return (
                <span
                  key={item.name}
                  className="px-4 py-2 text-sm text-slate-500 cursor-not-allowed"
                >
                  {item.name}
                </span>
              );
            }

            // Met Submenu (Dropdown)
            if (item.children) {
              const active = isChildActive(item.children);
              const isOpen = openDropdown === item.name;

              return (
                <div key={item.name} className="relative group">
                  <button
                    onClick={() => setOpenDropdown(isOpen ? null : item.name)}
                    onMouseEnter={() => setOpenDropdown(item.name)}
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      active
                        ? "bg-slate-800 text-emerald-400 border border-slate-700"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <span>{item.name}</span>
                    <span className="text-[10px] opacity-70">▼</span>
                  </button>

                  {/* Dropdown Menu */}
                  {isOpen && (
                    <div
                      onMouseLeave={() => setOpenDropdown(null)}
                      className="absolute left-0 mt-1 w-56 bg-slate-900 border border-slate-800 rounded-md shadow-xl py-1 z-50"
                    >
                      {item.children.map((sub) => {
                        const isSubActive = pathname === sub.href;
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={() => setOpenDropdown(null)}
                            className={`block px-4 py-2 text-xs font-medium transition-colors ${
                              isSubActive
                                ? "bg-slate-800 text-emerald-400 font-bold"
                                : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            }`}
                          >
                            {sub.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // Standaard item zonder children
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href || "#"}
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

{/* --- MOBIELE NAVIGATION (Fixed Bottom Bar met Zwevend Sub-menu) --- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-2 z-50">
        <div className="relative flex justify-around items-center">
          
          {/* Zwevend Sub-menu voor Mobiel (Positioned boven de onderbalk) */}
          {openDropdown && (
            <div className="absolute bottom-full mb-3 left-2 right-2 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-2 flex flex-col gap-1 z-50">
              <div className="text-[10px] uppercase font-bold text-slate-500 px-2 py-1 border-b border-slate-800">
                {openDropdown}
              </div>
              {navItems
                .find((n) => n.name === openDropdown)
                ?.children?.map((sub) => (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    onClick={() => setOpenDropdown(null)}
                    className={`p-2.5 text-xs rounded-md text-left transition-colors font-medium ${
                      pathname === sub.href
                        ? "bg-slate-800 text-emerald-400 font-bold"
                        : "text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    {sub.name}
                  </Link>
                ))}
            </div>
          )}

          {/* Onderbalk Knoppen */}
          {navItems.map((item) => {
            if (item.disabled) return null;

            if (item.children) {
              const active = isChildActive(item.children);
              const isOpen = openDropdown === item.name;

              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDropdown(isOpen ? null : item.name);
                  }}
                  className={`flex flex-col items-center py-1 px-3 rounded-md text-xs font-medium transition-colors ${
                    active || isOpen ? "text-emerald-400 font-bold" : "text-slate-400"
                  }`}
                >
                  <span className="flex items-center gap-0.5">
                    {item.name}
                    <span className="text-[9px]">{isOpen ? "▾" : "▴"}</span>
                  </span>
                </button>
              );
            }

            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href || "#"}
                onClick={() => setOpenDropdown(null)}
                className={`flex flex-col items-center py-1 px-3 rounded-md text-xs font-medium ${
                  isActive ? "text-emerald-400 font-bold" : "text-slate-400"
                }`}
              >
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

// "use client";

// import Link from "next/link";
// import { usePathname } from "next/navigation";

// const navItems = [
//   { name: "Home", href: "/" },
//   { name: "Basismodule", href: "/basismodule" },
//   { name: "Invoermodule", href: "/invoermodule/parameter-invoer" },
//   { name: "Analyse", href: "/analyse", disabled: true }, // Toekomstig
//   { name: "Instellingen", href: "/instellingen", disabled: true }, // Toekomstig
// ];

// export default function Navigation() {
//   const pathname = usePathname();

//   return (
//     <>
//       {/* --- DESKTOP NAVIGATION (Bovenzijde / Tab-stijl) --- */}
//       <header className="hidden md:flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
//         <div className="flex items-center space-x-2">
//           <div className="w-3 h-3 rounded-full bg-emerald-500" />
//           <span className="font-bold text-lg tracking-wide">Kennissysteem</span>
//         </div>
//         <nav className="flex space-x-1">
//           {navItems.map((item) => {
//             const isActive = pathname === item.href;
//             if (item.disabled) {
//               return (
//                 <span
//                   key={item.href}
//                   className="px-4 py-2 text-sm text-slate-500 cursor-not-allowed"
//                 >
//                   {item.name}
//                 </span>
//               );
//             }
//             return (
//               <Link
//                 key={item.href}
//                 href={item.href}
//                 className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
//                   isActive
//                     ? "bg-slate-800 text-emerald-400 border border-slate-700"
//                     : "text-slate-300 hover:bg-slate-800 hover:text-white"
//                 }`}
//               >
//                 {item.name}
//               </Link>
//             );
//           })}
//         </nav>
//       </header>

//       {/* --- MOBIELE NAVIGATION (Onderzijde Fixed Bar) --- */}
//       <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex justify-around p-2 z-50">
//         {navItems.map((item) => {
//           const isActive = pathname === item.href;
//           if (item.disabled) return null; // Verberg niet-actieve items op mobiel om ruimte te besparen
//           return (
//             <Link
//               key={item.href}
//               href={item.href}
//               className={`flex flex-col items-center py-1 px-3 rounded-md text-xs font-medium ${
//                 isActive ? "text-emerald-400 font-bold" : "text-slate-400"
//               }`}
//             >
//               <span>{item.name}</span>
//             </Link>
//           );
//         })}
//       </nav>
//     </>
//   );
// }