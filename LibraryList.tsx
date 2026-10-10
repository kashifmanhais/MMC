"use client";
import { useState } from "react";
import { LIBRARY } from "@/content/data";
export default function LibraryList() {
  const [q, setQ] = useState(""), [cat, setCat] = useState("All");
  const cats = ["All", ...Array.from(new Set(LIBRARY.map((l) => l.cat)))];
  const items = LIBRARY.filter((l) => (cat === "All" || l.cat === cat) && (l.title + l.text).toLowerCase().includes(q.toLowerCase()));
  return (<>
    <div className="row"><div><label htmlFor="q">Search</label><input id="q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search resources" /></div>
      <div><label htmlFor="cat">Category</label><select id="cat" value={cat} onChange={(e) => setCat(e.target.value)}>{cats.map((c) => <option key={c}>{c}</option>)}</select></div></div>
    <div className="grid" style={{ marginTop: 14 }} aria-live="polite">{items.length ? items.map((l) => <div className="card" key={l.title}><span className="note">{l.cat} · {l.level}</span><h3>{l.title}</h3><p>{l.text}</p></div>) : <p>No resources match your search.</p>}</div>
  </>);
}
