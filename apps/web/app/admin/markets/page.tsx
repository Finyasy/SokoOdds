import { AdminConsoleNav } from "@/components/admin/admin-console-nav";
import { MarketCommentReviewBoard } from "@/components/admin/market-comment-review-board";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function AdminMarketCommentsPage() {
  return (
    <>
      <SiteHeader />
      <main className="site-shell page-stack">
        <AdminConsoleNav />
        <MarketCommentReviewBoard />
      </main>
      <SiteFooter />
    </>
  );
}
