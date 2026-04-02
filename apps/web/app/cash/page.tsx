import { CashExperience } from "@/components/cash/cash-experience";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function CashPage() {
  return (
    <>
      <SiteHeader />
      <main className="site-shell page-stack">
        <CashExperience />
      </main>
      <SiteFooter />
    </>
  );
}
