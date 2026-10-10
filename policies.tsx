import { Fragment } from "react";
import { Card, Notice } from "@/components/site/ui";
import { site } from "@/config/site";
import { POLICIES, type Policy } from "./policy-text";

/** Wording lives in policy-text.ts (single source, also used by the preview site). DRAFT for owner review. */
const T = ({ s }: { s: string }) => {
  const [first, ...rest] = s.split("{EMAIL}");
  return <>{first}{rest.map((r, i) => <Fragment key={i}><a className="al" href={`mailto:${site.email}`}>{site.email}</a>{r}</Fragment>)}</>;
};
const Render = ({ p }: { p: Policy }) => (
  <Card title={p.title}>
    {p.intro && <p><T s={p.intro} /></p>}
    {p.bullets.length > 0 && <ul>{p.bullets.map((b, i) => <li key={i}>{b.lead && <b>{b.lead}: </b>}<T s={b.text} /></li>)}</ul>}
    {p.outro && <p><T s={p.outro} /></p>}
  </Card>
);
export const Banner = () => <Notice><b>Draft for owner review.</b> This is not legal advice and makes no claim of legal compliance. Items marked [OWNER TO CONFIRM] must be decided and approved by the owner before publication.</Notice>;
export const Terms = () => <Render p={POLICIES.terms} />;
export const Privacy = () => <Render p={POLICIES.privacy} />;
export const Refund = () => <Render p={POLICIES.refund} />;
