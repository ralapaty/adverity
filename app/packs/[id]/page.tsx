import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { isReviewPackEnabled } from "../../../src/domain/flag";
import { database } from "../../../src/server/deps";
import { actorFromSession, packView } from "../../../src/server/service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PackPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isReviewPackEnabled(process.env)) notFound();
  const session = actorFromSession(database(), (await cookies()).get("adverity_session")?.value ?? null);
  if (!session) redirect("/sign-in");
  const { id } = await params;
  const pack = packView(database(), id);
  if (!pack) notFound();
  const market = pack.market_packs[0];
  const mine = pack.assignments.filter((row) => row.actor_id === session.actorId);
  const routeRole = pack.user_type === "freelance" ? "external_client" : "internal_owner";
  return (
    <>
      <h1>{pack.advertiser}</h1>
      <p className="status" role="status">
        Status: {pack.status}. Export {market.export_eligible ? "is open for this version" : "is closed"}.
        {market.roles_overlap ? " This review is not an independent review." : ""}
        {market.independent_review && market.review.copy_expert === "approved" ? " Copy expert and practitioner are different people." : ""}
      </p>
      <p>Audience: {pack.audience}. Route: {pack.approver_route}. Playbook: {pack.playbook_version}.</p>
      {pack.limitations.length > 0 ? (
        <section>
          <h2>Limitations</h2>
          <ul>{pack.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      ) : null}
      <section>
        <h2>Intent</h2>
        <ul>
          {pack.intent_map.map((row) => (
            <li key={row.keyword_theme}>{row.keyword_theme}: {row.intent_label}, {row.researched ? "researched" : "unresearched"}</li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Evidence</h2>
        {pack.evidence.map((item) => (
          <p key={item.id}><strong>{item.label}</strong> — {item.excerpt}</p>
        ))}
      </section>
      <section>
        <h2>Assets</h2>
        <table>
          <thead><tr><th>Kind</th><th>Text</th><th>Characters</th><th>Flags</th></tr></thead>
          <tbody>
            {market.assets.map((asset) => (
              <tr key={`${asset.kind}-${asset.text}`}>
                <td>{asset.kind}</td>
                <td>{asset.text}</td>
                <td>{asset.google_count === null ? "not counted" : `${asset.google_count} characters`}</td>
                <td>{asset.flags.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section>
        <h2>Critique</h2>
        {market && pack.critique_log.map((entry) => (
          <article key={entry.before}>
            <p>Before: {entry.before}</p>
            <p>Issue: {entry.issue}</p>
            <p>After: {entry.after}</p>
          </article>
        ))}
      </section>
      {mine.some((row) => row.role === "practitioner") ? (
        <form method="post" action={`/api/packs/${id}/assignments`}>
          <h2>Assign a reviewer</h2>
          <input type="hidden" name="csrf" value={session.csrf} />
          <label htmlFor="role">Role</label>
          <select id="role" name="role">
            <option value="copy_expert">Copy expert</option>
            <option value="external_client">External client</option>
            <option value="internal_owner">Internal owner</option>
            <option value="language_reviewer">Language reviewer</option>
          </select>
          <label htmlFor="username">Username</label>
          <input id="username" name="username" required />
          <input type="hidden" name="canAssessLocale" value="false" />
          <label className="inline" htmlFor="canAssessLocale"><input id="canAssessLocale" name="canAssessLocale" type="checkbox" value="true" defaultChecked /> Can assess this locale</label>
          <button type="submit">Save assignment</button>
        </form>
      ) : null}
      {mine.some((row) => row.role === "copy_expert" || row.role === "language_reviewer" || row.role === routeRole) ? (
        <form method="post" action={`/api/packs/${id}/approvals`}>
          <h2>Approve this version</h2>
          <input type="hidden" name="csrf" value={session.csrf} />
          <label htmlFor="approvalRole">Your role on this pack</label>
          <select id="approvalRole" name="role" defaultValue={mine.find((row) => row.role !== "practitioner")?.role}>
            {mine.filter((row) => row.role !== "practitioner").map((row) => (
              <option key={row.role} value={row.role}>{row.role}</option>
            ))}
          </select>
          {mine.some((row) => row.role === routeRole) ? (
            <>
              <label className="inline" htmlFor="confirmDestination"><input id="confirmDestination" name="confirmDestination" type="checkbox" value="true" /> I confirm the destination</label>
              <label className="inline" htmlFor="confirmOffer"><input id="confirmOffer" name="confirmOffer" type="checkbox" value="true" /> I confirm the offer, including any design-partner invitation</label>
            </>
          ) : null}
          <button type="submit">Approve exact version</button>
        </form>
      ) : null}
      <form method="post" action={`/api/packs/${id}/comments`}>
        <h2>Comment</h2>
        <input type="hidden" name="csrf" value={session.csrf} />
        <label htmlFor="comment">Comment</label>
        <textarea id="comment" name="body" required />
        <button type="submit">Add comment</button>
      </form>
      {market.export_eligible ? <p><a href={`/api/packs/${id}/export`}>Download review extract</a></p> : <p>Download stays unavailable until this version is approved.</p>}
      <form method="post" action="/api/sign-out">
        <input type="hidden" name="csrf" value={session.csrf} />
        <button type="submit">Sign out</button>
      </form>
    </>
  );
}
