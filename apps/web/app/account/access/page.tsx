import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

type AccountAccessPageProps = {
  searchParams?: Promise<{
    mode?: string | string[];
  }>;
};

function readMode(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AccountAccessPage({ searchParams }: AccountAccessPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const mode = readMode(resolvedSearchParams.mode);
  const isLogin = mode === "login";

  return (
    <>
      <SiteHeader />
      <main className="site-shell page-stack">
        <section className="portfolio-shell">
          <div className="cash-signin-card account-access-card">
            <div>
              <span className="section-kicker">{isLogin ? "Log in" : "Sign up"}</span>
              <h1>{isLogin ? "Reconnect your SokoOdds wallet." : "Create your SokoOdds wallet."}</h1>
              <p>
                Use the same M-Pesa number you trade with. We will take you straight to your
                account surfaces after this step.
              </p>
            </div>
          </div>
        </section>

        <section className="portfolio-shell">
          <section className="portfolio-card account-access-form-card">
            <div className="portfolio-card__head">
              <span className="market-chip">Account access</span>
              <strong>{isLogin ? "Use your existing number" : "Start with your phone"}</strong>
            </div>

            <form method="post" action="/api/account/session" className="account-access-form">
              <input type="hidden" name="redirectTo" value="/portfolio" />

              <label>
                First name
                <input
                  className="input-shell"
                  type="text"
                  name="firstName"
                  placeholder="Bryan"
                  required
                />
              </label>

              <label>
                M-Pesa number
                <input
                  className="input-shell"
                  type="tel"
                  name="phone"
                  inputMode="tel"
                  placeholder="07XXXXXXXX"
                  required
                />
              </label>

              <div className="portfolio-actions">
                <button type="submit" className="primary-button">
                  Continue to portfolio
                </button>
              </div>
            </form>

            <p className="portfolio-inline-note">
              This fallback path works even when the client wallet sheet is unavailable in the
              current dev session.
            </p>
          </section>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
