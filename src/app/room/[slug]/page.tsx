import { db } from "@/db";
import { rooms } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { RoomJoinForm } from "@/components/room/room-join-form";
import Link from "next/link";

interface RoomPageProps {
  params: Promise<{ slug: string }>;
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { slug } = await params;

  const room = await db.query.rooms.findFirst({
    where: eq(rooms.slug, slug),
  });

  if (!room) {
    notFound();
  }

  const session = await getServerSession(authOptions);
  const isOwner = session?.user.id === room.ownerId;
  const isAuthenticated = !!session;

  // If guests not allowed and not authenticated, redirect to login
  if (!room.allowGuests && !isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Members Only</h1>
          <p className="text-muted-foreground mb-6">
            This room requires you to be logged in to join.
          </p>
          <Link
            href={`/login?callbackUrl=/room/${slug}`}
            className="inline-block px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition"
          >
            Sign in to join
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <RoomJoinForm
        room={{
          id: room.id,
          slug: room.slug,
          name: room.name,
          hasPassword: !!room.password,
          allowGuests: room.allowGuests,
          isScheduled: room.isScheduled,
          scheduledAt: room.scheduledAt?.toISOString() || null,
        }}
        user={
          session?.user
            ? {
                id: session.user.id,
                name: session.user.name || undefined,
                email: session.user.email,
              }
            : null
        }
        isOwner={isOwner}
      />
    </main>
  );
}
