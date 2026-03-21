import { AdminConsoleNav } from "@/components/admin/admin-console-nav";
import { WalletSupportBoard } from "@/components/admin/wallet-support-board";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function AdminSupportPage() {
  return (
    <>
      <SiteHeader />
      <main className="site-shell page-stack">
        <AdminConsoleNav />
        <WalletSupportBoard />
      </main>
      <SiteFooter />
    </>
  );
}
