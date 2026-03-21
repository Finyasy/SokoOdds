import { KycReviewBoard } from "@/components/admin/kyc-review-board";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function AdminKycPage() {
  return (
    <>
      <SiteHeader />
      <main className="site-shell page-stack">
        <KycReviewBoard />
      </main>
      <SiteFooter />
    </>
  );
}
