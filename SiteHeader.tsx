"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./ui";

const PRIMARY = [["/", "Home"], ["/programs", "Programs"], ["/about", "About"], ["/contact", "Contact"]] as const;
const SECONDARY = [["/classes", "Online Classes"], ["/private-call", "Private Call"], ["/vip", "VIP Community"], ["/analysis", "Live Analysis Updates"], ["/journal", "Live Analysis Journal"], ["/calculator", "Notes & Calculator"], ["/library", "Library"], ["/login", "Login"], ["/policies", "Policies"]] as const;

export default function SiteHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false); // mobile menu
  const [menu, setMenu] = useState(false); // desktop dropdown
  useEffect(() => { setOpen(false); setMenu(false); }, [path]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(false); };
    const close = () => setMenu(false);
    addEventListener("keydown", key); addEventListener("click", close);
    return () => { removeEventListener("keydown", key); removeEventListener("click", close); };
  }, []);
  const link = ([href, label]: readonly [string, string]) => (
    <Link key={href} href={href} className={path === href ? "on" : undefined} aria-current={path === href ? "page" : undefined}>{label}</Link>
  );
  return (
    <header>
      <div className="bar">
        <Link className="logo" href="/" aria-label="MMC Redesign, Mirror Market Concept, home">
          <Logo /><span><b>MMC REDESIGN</b><small>MIRROR MARKET CONCEPT</small></span>
        </Link>
        <button id="mb" aria-expanded={open} aria-controls="nv" onClick={() => setOpen((o) => !o)}>Menu</button>
        <nav id="nv" className={open ? "open" : ""} aria-label="Main">
          {PRIMARY.map(link)}
          <button id="dm" type="button" aria-expanded={menu} aria-controls="sec" className={SECONDARY.some(([h]) => h === path) ? "on" : undefined} onClick={(e) => { e.stopPropagation(); setMenu((m) => !m); }}>Menu ▾</button>
          <div id="sec" className={menu ? "open" : ""}>{SECONDARY.map(link)}</div>
        </nav>
      </div>
    </header>
  );
}
