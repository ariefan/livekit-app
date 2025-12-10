"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/rooms", label: "My Rooms" },
  { href: "/recordings", label: "Recordings" },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex items-center gap-6">
      {navLinks.map((link) => {
        const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm font-medium transition ${
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-primary"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
