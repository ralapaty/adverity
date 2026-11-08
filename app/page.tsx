import { cookies, headers } from "next/headers";
import { FAQS } from "../src/content/site";
import { isReviewPackEnabled } from "../src/domain/flag";
import { database } from "../src/server/deps";
import { actorFromSession } from "../src/server/service";

export const dynamic = "force-dynamic";

function faqJson() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export default async function HomePage() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const enabled = isReviewPackEnabled(process.env);
  let csrf = "";
  let actor = "";
  if (enabled) {
    const sessionId = (await cookies()).get("adverity_session")?.value ?? null;
    const session = actorFromSession(database(), sessionId);
    if (session) {
      actor = session.actorId;
      csrf = session.csrf;
    }
  }
  return (
    <>
      <h1>Review-ready Google Search ads</h1>
      <p>
        Freelance and in-house Google Ads subject-matter experts use AdVerity to prepare an intent-led draft,
        then keep export closed until a copy expert and the route approver sign the exact version.
      </p>
      <p>The session cookie is required to sign in. Product metrics wait for a separate yes.</p>
      <section aria-labelledby="faq-heading">
        <h2 id="faq-heading">Questions</h2>
        {FAQS.map((item) => (
          <article key={item.question}>
            <h3>{item.question}</h3>
            <p>{item.answer}</p>
          </article>
        ))}
      </section>
      <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJson()) }} />
      {enabled && actor ? <Workspace csrf={csrf} actor={actor} /> : null}
      {enabled && !actor ? <p><a href="/sign-in">Sign in to generate a review-ready ad pack</a></p> : null}
    </>
  );
}

function Workspace({ csrf, actor }: { csrf: string; actor: string }) {
  return (
    <section aria-labelledby="generate-heading">
      <h2 id="generate-heading">Generate a review-ready ad pack</h2>
      <p>Signed in as {actor}. Pilot sign-in is not an enterprise identity provider.</p>
      <form method="post" action="/api/consent">
        <input type="hidden" name="csrf" value={csrf} />
        <button type="submit">Record consent for product metrics</button>
      </form>
      <form method="post" action="/api/consent">
        <input type="hidden" name="csrf" value={csrf} />
        <input type="hidden" name="withdraw" value="true" />
        <button type="submit">Withdraw product-metric consent</button>
      </form>
      <form method="get" action="/api/privacy">
        <button type="submit">Download my packs</button>
      </form>
      <form method="post" action="/api/privacy">
        <input type="hidden" name="csrf" value={csrf} />
        <button type="submit">Delete my packs</button>
      </form>
      <form method="post" action="/api/packs">
        <input type="hidden" name="csrf" value={csrf} />
        <label htmlFor="productUrl">Product URL</label>
        <input id="productUrl" name="productUrl" type="url" required defaultValue="https://healthcrew.ai/" />
        <label htmlFor="destinationUrl">Destination URL</label>
        <input id="destinationUrl" name="destinationUrl" type="url" required defaultValue="https://healthcrew.ai/" />
        <label htmlFor="advertiser">Advertiser</label>
        <input id="advertiser" name="advertiser" required defaultValue="HealthCrew.ai" />
        <label htmlFor="userType">Your route</label>
        <select id="userType" name="userType" defaultValue="freelance">
          <option value="freelance">Freelance — external client approves</option>
          <option value="in_house">In-house — internal owner approves</option>
        </select>
        <label htmlFor="audience">Ad audience</label>
        <input id="audience" name="audience" required defaultValue="Healthcare staffing-agency owners" />
        <label htmlFor="objective">Objective</label>
        <input id="objective" name="objective" required defaultValue="Platform discovery" />
        <label htmlFor="campaignType">Campaign type</label>
        <select id="campaignType" name="campaignType" defaultValue="search">
          <option value="search">Search</option>
          <option value="performance_max">Performance Max text handoff</option>
        </select>
        <label htmlFor="adGroup">Ad group (30 characters or fewer)</label>
        <input id="adGroup" name="adGroup" required maxLength={30} defaultValue="Healthcare hiring tools" />
        <label htmlFor="paths">Two paths, comma separated</label>
        <input id="paths" name="paths" defaultValue="hiring-tools,next-step" />
        <label htmlFor="keywords">Keyword candidates, as text|Phrase separated by semicolons</label>
        <input id="keywords" name="keywords" defaultValue="" />
        <label htmlFor="businessName">Business name for Performance Max</label>
        <input id="businessName" name="businessName" defaultValue="HealthCrew AI" />
        <label htmlFor="keywordThemes">Keyword themes</label>
        <input id="keywordThemes" name="keywordThemes" required defaultValue="healthcare recruitment software; healthcare staffing software" />
        <label htmlFor="locale">Locale</label>
        <input id="locale" name="locale" required defaultValue="en-GB" />
        <label htmlFor="offerSummary">Offer summary</label>
        <input id="offerSummary" name="offerSummary" required defaultValue="Design-partner conversation, availability to be confirmed" />
        <label htmlFor="brief">Brief</label>
        <textarea id="brief" name="brief" required defaultValue="Prepare UK English search-ad drafts for healthcare staffing-agency owners exploring recruitment technology. Focus on platform discovery. Do not advertise agency staffing services." />
        <button type="submit">Generate a review-ready ad pack</button>
      </form>
      <form method="post" action="/api/sign-out">
        <input type="hidden" name="csrf" value={csrf} />
        <button type="submit">Sign out</button>
      </form>
    </section>
  );
}
