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
      <p className="eyebrow">Search and Performance Max</p>
      <h1>Review-ready Google Search ads</h1>
      <p className="lede">
        Freelance and in-house Google Ads subject-matter experts use AdVerity to prepare an intent-led draft,
        then keep export closed until a copy expert and the route approver sign the exact version.
      </p>
      <div className="steps">
        <article className="step"><div className="num">01</div><h2>Evidence</h2><p>Read the public page. The page is data, not an instruction.</p></article>
        <article className="step"><div className="num">02</div><h2>Draft</h2><p>A private playbook shapes the argument. The brief is not used for training.</p></article>
        <article className="step"><div className="num">03</div><h2>Critic</h2><p>A second pass rejects a claim the page has not supported.</p></article>
        <article className="step"><div className="num">04</div><h2>Count</h2><p>Character limits are checked in code. Nothing is silently cut to fit.</p></article>
        <article className="step"><div className="num">05</div><h2>Sign-off</h2><p>Copy expert, then the client or the internal owner. An edit clears both.</p></article>
      </div>
      <section className="truth" aria-label="What is actually true">
        <div>
          <div className="num">REALITY</div>
          <h2>The draft is not the launch.</h2>
          <p>No impressions, no lift, and no result is inferred from a review pack.</p>
        </div>
        <div>
          <div className="num">THE VERSION</div>
          <h2>One hash.</h2>
          <p>Change the text, the offer, the locale, or the destination, and both approvals drop.</p>
        </div>
        <div>
          <div className="num">THE EXAMPLE</div>
          <h2>A weak claim stays out.</h2>
          <p>HealthCrew.ai shows the format. It is not proof of a contract.</p>
        </div>
      </section>
      <p>The session cookie is required to sign in. Product metrics wait for a separate yes.</p>
      <section className="faq" aria-labelledby="faq-heading">
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
      {enabled && !actor ? <p><a className="button" href="/sign-in">Sign in to generate a review-ready ad pack</a></p> : null}
    </>
  );
}

function Workspace({ csrf, actor }: { csrf: string; actor: string }) {
  return (
    <section aria-labelledby="generate-heading">
      <h2 id="generate-heading">Generate a review-ready ad pack</h2>
      <p>Signed in as {actor}. Pilot sign-in is not an enterprise identity provider.</p>
      <div className="actions">
        <form method="post" action="/api/consent">
          <input type="hidden" name="csrf" value={csrf} />
          <button className="quiet" type="submit">Record consent for product metrics</button>
        </form>
        <form method="post" action="/api/consent">
          <input type="hidden" name="csrf" value={csrf} />
          <input type="hidden" name="withdraw" value="true" />
          <button className="quiet" type="submit">Withdraw product-metric consent</button>
        </form>
        <form method="get" action="/api/privacy">
          <button className="quiet" type="submit">Download my packs</button>
        </form>
        <form method="post" action="/api/privacy">
          <input type="hidden" name="csrf" value={csrf} />
          <button className="quiet" type="submit">Delete my packs</button>
        </form>
      </div>
      <form method="post" action="/api/packs">
        <input type="hidden" name="csrf" value={csrf} />
        <div className="fields">
        <div>
        <label htmlFor="productUrl">Product URL</label>
        <input id="productUrl" name="productUrl" type="url" required defaultValue="https://healthcrew.ai/" />
        </div>
        <div>
        <label htmlFor="destinationUrl">Destination URL</label>
        <input id="destinationUrl" name="destinationUrl" type="url" required defaultValue="https://healthcrew.ai/" />
        </div>
        <div>
        <label htmlFor="advertiser">Advertiser</label>
        <input id="advertiser" name="advertiser" required defaultValue="HealthCrew.ai" />
        </div>
        <div>
        <label htmlFor="userType">Your route</label>
        <select id="userType" name="userType" defaultValue="freelance">
          <option value="freelance">Freelance — external client approves</option>
          <option value="in_house">In-house — internal owner approves</option>
        </select>
        </div>
        <div>
        <label htmlFor="audience">Ad audience</label>
        <input id="audience" name="audience" required defaultValue="Healthcare staffing-agency owners" />
        </div>
        <div>
        <label htmlFor="objective">Objective</label>
        <input id="objective" name="objective" required defaultValue="Platform discovery" />
        </div>
        <div>
        <label htmlFor="campaignType">Campaign type</label>
        <select id="campaignType" name="campaignType" defaultValue="search">
          <option value="search">Search</option>
          <option value="performance_max">Performance Max text handoff</option>
        </select>
        </div>
        <div>
        <label htmlFor="adGroup">Ad group (30 characters or fewer)</label>
        <input id="adGroup" name="adGroup" required maxLength={30} defaultValue="Healthcare hiring tools" />
        </div>
        <div>
        <label htmlFor="paths">Two paths, comma separated</label>
        <input id="paths" name="paths" defaultValue="hiring-tools,next-step" />
        </div>
        <div className="span-2">
        <label htmlFor="keywords">Keyword candidates, as text|Phrase separated by semicolons</label>
        <input id="keywords" name="keywords" defaultValue="" />
        </div>
        <div>
        <label htmlFor="businessName">Business name for Performance Max</label>
        <input id="businessName" name="businessName" defaultValue="HealthCrew AI" />
        </div>
        <div>
        <label htmlFor="keywordThemes">Keyword themes</label>
        <input id="keywordThemes" name="keywordThemes" required defaultValue="healthcare recruitment software; healthcare staffing software" />
        </div>
        <div>
        <label htmlFor="locale">Locale</label>
        <input id="locale" name="locale" required defaultValue="en-GB" />
        </div>
        <div>
        <label htmlFor="offerSummary">Offer summary</label>
        <input id="offerSummary" name="offerSummary" required defaultValue="Design-partner conversation, availability to be confirmed" />
        </div>
        <div className="span-2">
        <label htmlFor="brief">Brief</label>
        <textarea id="brief" name="brief" required defaultValue="Prepare UK English search-ad drafts for healthcare staffing-agency owners exploring recruitment technology. Focus on platform discovery. Do not advertise agency staffing services." />
        </div>
        </div>
        <button type="submit">Generate a review-ready ad pack</button>
      </form>
      <form method="post" action="/api/sign-out">
        <input type="hidden" name="csrf" value={csrf} />
        <button type="submit">Sign out</button>
      </form>
    </section>
  );
}
