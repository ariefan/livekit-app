import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserMenu } from "@/components/auth/user-menu";
import { ModeToggle } from "@/components/mode-toggle";

export default async function RecordingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="text-xl font-bold text-primary">
                Video Chat
              </Link>
              <nav className="hidden md:flex items-center gap-6">
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition"
                >
                  Dashboard
                </Link>
                <Link
                  href="/rooms"
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition"
                >
                  My Rooms
                </Link>
                <Link
                  href="/recordings"
                  className="text-sm font-medium text-primary"
                >
                  Recordings
                </Link>
              </nav>
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
  );
}
