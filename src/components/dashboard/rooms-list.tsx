"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Copy, Trash2, Video, Calendar, Lock, Users } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";

interface Room {
  id: string;
  slug: string;
  name: string;
  isScheduled: boolean;
  scheduledAt: Date | null;
  allowGuests: boolean;
  password: string | null;
  createdAt: Date;
}

interface RoomsListProps {
  rooms: Room[];
}

export function RoomsList({ rooms }: RoomsListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (roomId: string, roomName: string) => {
    const confirmed = await confirm({
      title: "Delete Room",
      description: `Are you sure you want to delete "${roomName}"? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "destructive",
    });

    if (!confirmed) return;

    setDeletingId(roomId);
    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.refresh();
      }
    } finally {
      setDeletingId(null);
    }
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/room/${slug}`;
    navigator.clipboard.writeText(url);
    toast("Room link copied to clipboard!", "success");
  };

  const formatDateTime = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (rooms.length === 0) {
    return (
      <div className="bg-card rounded-lg border p-12 text-center">
        <div className="text-muted-foreground mb-4">
          <Video className="w-16 h-16 mx-auto" strokeWidth={1.5} />
        </div>
        <h3 className="text-lg font-medium mb-2">No rooms yet</h3>
        <p className="text-muted-foreground">
          Create your first room to start hosting meetings.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile card view */}
      <div className="space-y-4 md:hidden">
        {rooms.map((room) => (
          <Card key={room.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium truncate">{room.name}</h3>
                  <p className="text-sm text-muted-foreground font-mono truncate">
                    {room.slug}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => copyLink(room.slug)}
                    title="Copy link"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(room.id, room.name)}
                    disabled={deletingId === room.id}
                    className="text-destructive hover:text-destructive"
                    title="Delete room"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {room.isScheduled && room.scheduledAt && (
                  <Badge className="bg-purple-600 hover:bg-purple-600 text-white text-xs">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDateTime(room.scheduledAt)}
                  </Badge>
                )}
                <Badge
                  className={`text-xs ${
                    room.allowGuests
                      ? "bg-green-600 hover:bg-green-600 text-white"
                      : "bg-yellow-600 hover:bg-yellow-600 text-white"
                  }`}
                >
                  <Users className="h-3 w-3 mr-1" />
                  {room.allowGuests ? "Guests" : "Members"}
                </Badge>
                {room.password && (
                  <Badge variant="secondary" className="text-xs">
                    <Lock className="h-3 w-3 mr-1" />
                    Protected
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(room.createdAt)}
                </span>
                <Button size="sm" asChild>
                  <Link href={`/room/${room.slug}`}>Join</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Room</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rooms.map((room) => (
              <TableRow key={room.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{room.name}</div>
                    <div className="text-sm text-muted-foreground font-mono">
                      {room.slug}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    {room.isScheduled && room.scheduledAt && (
                      <Badge className="bg-purple-600 hover:bg-purple-600 text-white">
                        {formatDateTime(room.scheduledAt)}
                      </Badge>
                    )}
                    <Badge
                      className={
                        room.allowGuests
                          ? "bg-green-600 hover:bg-green-600 text-white"
                          : "bg-yellow-600 hover:bg-yellow-600 text-white"
                      }
                    >
                      {room.allowGuests ? "Guests allowed" : "Members only"}
                    </Badge>
                    {room.password && (
                      <Badge variant="secondary">Password protected</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDateTime(room.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyLink(room.slug)}
                      title="Copy link"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="sm" asChild>
                      <Link href={`/room/${room.slug}`}>Join</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(room.id, room.name)}
                      disabled={deletingId === room.id}
                      className="text-destructive hover:text-destructive"
                      title="Delete room"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
