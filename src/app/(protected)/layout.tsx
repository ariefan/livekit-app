import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserMenu } from "@/components/auth/user-menu";
import { ModeToggle } from "@/components/mode-toggle";
import { MainNav } from "@/components/layouts/main-nav";
import { MobileNav } from "@/components/layouts/mobile-nav";
import { ToastProvider } from "@/components/ui/toast";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <ConfirmProvider>
      <ToastProvider>
        <div className="min-h-screen">
          {/* Header */}
          <header className="bg-card border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center gap-4 md:gap-8">
                  <MobileNav />
                  <Link href="/" className="text-xl font-bold text-primary">
                    {process.env.NEXT_PUBLIC_APP_NAME || "Video Chat"}
                  </Link>
                  <MainNav />
                </div>
                <div className="flex items-center gap-2">
                  <ModeToggle />
                  <UserMenu />
                </div>
              </div>
            </div>
          </header>

          {/* Main content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </div>
      </ToastProvider>
    </ConfirmProvider>
  );
}
