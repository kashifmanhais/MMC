import Link from "next/link";
import { site, isWhatsAppUrl } from "@/config/site";
import { Logo } from "./ui";

/** Exactly three sections: Explore, Information, Contact. */
export default function SiteFooter() {
  const vipOk = isWhatsAppUrl(site.vipUrl);
  return (
    <footer>
      <div className="in">
        <div className="fb"><Logo h={48} alt="MMC Redesign logo" /><span><b>MMC REDESIGN</b><small>MIRROR MARKET CONCEPT</small></span></div>
        <div className="fcols">
          <div><h2>Explore</h2>
            <Link href="/classes">Online Classes</Link>
            <Link href="/private-call">Private Call</Link>
            {vipOk ? <a href={site.vipUrl} target="_blank" rel="noopener noreferrer">VIP Community (WhatsApp)</a> : <Link href="/vip">VIP Community (WhatsApp)</Link>}
          </div>
          <div><h2>Information</h2>
            <Link href="/about">About</Link><Link href="/contact">Contact</Link>
            <Link href="/terms">Terms of Service</Link><Link href="/privacy">Privacy Policy</Link><Link href="/refund">Refund Policy</Link>
          </div>
          <div><h2>Contact</h2>
            <a href={`mailto:${site.email}`}>{site.email}</a>
            <a href={`tel:${site.phone}`}>{site.phone}</a>
          </div>
        </div>
        <p className="fc">© MMC Redesign</p>
      </div>
    </footer>
  );
}
