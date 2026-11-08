import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { isReviewPackEnabled } from "../../src/domain/flag";
import { database } from "../../src/server/deps";
import { actorFromSession } from "../../src/server/service";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  if (!isReviewPackEnabled(process.env)) notFound();
  const existing = actorFromSession(database(), (await cookies()).get("adverity_session")?.value ?? null);
  if (existing) redirect("/");
  return (
    <>
      <p className="eyebrow">Pilot access</p>
      <h1>Sign in</h1>
      <p className="lede">Pilot sign-in is not an enterprise identity provider. Your role on a pack is assigned on the server.</p>
      <form className="narrow" method="post" action="/api/session">
        <label htmlFor="username">Username</label>
        <input id="username" name="username" autoComplete="username" required />
        <label htmlFor="passphrase">Passphrase</label>
        <input id="passphrase" name="passphrase" type="password" autoComplete="current-password" required />
        <button type="submit">Sign in</button>
      </form>
    </>
  );
}
