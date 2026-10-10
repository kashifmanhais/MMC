import Link from "next/link";
import { Hero, Logo } from "@/components/site/ui";

const Tile = ({ href, title, text, cta }: { href: string; title: string; text: string; cta: string }) => (
  <Link className="card" href={href} style={{ textDecoration: "none" }}><h3>{title}</h3><p>{text}</p><span className="sans al">{cta} →</span></Link>
);
export default function Home() {
  return (
    <main className="page">
      <Hero title="MMC Redesign" action={<><Link className="btn" href="/programs">Explore Programs</Link> <Link className="btn dk" style={{ border: "1px solid var(--g)" }} href="/classes">Online Classes</Link></>}>
        Mirror Market Concept: structured market education for traders. Study price structure, plan entries and exits, and keep honest records of your own analysis.
      </Hero>
      <div className="card" style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap", marginBottom: 18 }}>
        <div className="book" role="img" aria-label="Book cover mockup: The World of QFL, MMC Redesign"><Logo h={54} /><strong>The World of QFL</strong><small>MMC Redesign</small></div>
        <div style={{ flex: 1, minWidth: 230 }}>
          <h2 style={{ marginTop: 0 }}>The World of QFL</h2>
          <p>A book from MMC Redesign. QFLs are part of the trading education framework behind our programs.</p>
          <p className="note">Release date, price and availability have not been announced. This site does not sell the book yet.</p>
        </div>
      </div>
      <div className="grid">
        <Tile href="/classes" title="Online Classes" text="Structured market education covering 15 topics, from risk management to journal training." cta="Book Your Seat" />
        <Tile href="/private-call" title="Private Call" text="One-on-one session of 60 minutes. Request a date and time and send your prepared questions. Requests stay pending until confirmed." cta="Request a call" />
        <Tile href="/vip" title="VIP Community" text="A WhatsApp channel for members." cta="Join" />
        <Tile href="/journal" title="Live Analysis Journal" text="Record your own analysis and trades with before/after screenshots and monthly RR charts." cta="Open the journal" />
        <Tile href="/calculator" title="Notes & Calculator" text="Forex and Gold lot-size calculator with private notes." cta="Open" />
      </div>
    </main>
  );
}
