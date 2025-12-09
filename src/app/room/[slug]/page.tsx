import { db } from "@/db";
import { rooms } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { RoomJoinForm } from "@/components/room/room-join-form";

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
      <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Members Only</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            This room requires you to be logged in to join.
          </p>
          <a
            href={`/login?callbackUrl=/room/${slug}`}
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
          >
            Sign in to join
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
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
