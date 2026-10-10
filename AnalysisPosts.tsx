import { Card } from "@/components/site/ui";
import { listPublishedPosts } from "@/lib/analysis/posts";

/** Server component: reads posts from the database on each request. The owner adds or edits posts at /admin/analysis, with no rebuild. */
export default async function AnalysisPosts() {
  const res = await listPublishedPosts();
  return (
    <Card title="Public analysis updates">
      {!res.ok ? <p className="note"><b>Not available yet.</b> {res.error}</p>
        : res.data.length === 0 ? <p className="note"><b>No posts yet.</b> The owner has not published any analysis links. Nothing is shown rather than inventing analysis.</p>
        : <ul style={{ paddingLeft: 18 }}>{res.data.map((p) => (
            <li key={p.id} style={{ marginBottom: 10 }}>
              <a className="al" href={p.url} target="_blank" rel="noopener noreferrer">{p.title}</a>
              {p.note && <> — {p.note}</>}<br /><span className="note">{p.created_at.slice(0, 10)}</span>
            </li>))}</ul>}
    </Card>
  );
}
