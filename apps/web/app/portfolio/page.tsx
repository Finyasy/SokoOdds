import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { PortfolioExperience } from "@/components/portfolio/portfolio-experience";

export default function PortfolioPage() {
  return (
    <>
      <SiteHeader />
      <main className="site-shell page-stack">
        <PortfolioExperience />
      </main>
      <SiteFooter />
    </>
  );
}
