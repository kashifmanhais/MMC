import type { ReactNode } from "react";
import { site } from "@/config/site";
export const Logo = ({ h = 46, alt = "" }: { h?: number; alt?: string }) => (
  <span className="lg"><img src={site.logoPath} alt={alt} style={{ height: h }} /></span>
);
export const Hero = ({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) => (
  <section className="hero"><h1>{title}</h1>{children && <p>{children}</p>}{action}</section>
);
export const Card = ({ title, children, style }: { title?: string; children: ReactNode; style?: React.CSSProperties }) => (
  <div className="card" style={style}>{title && <h2 style={{ marginTop: 0 }}>{title}</h2>}{children}</div>
);
export const Notice = ({ kind = "warn", children }: { kind?: "warn" | "err" | "ok"; children: ReactNode }) => (
  <div className={`msg ${kind}`} role={kind === "err" ? "alert" : "status"}>{children}</div>
);
