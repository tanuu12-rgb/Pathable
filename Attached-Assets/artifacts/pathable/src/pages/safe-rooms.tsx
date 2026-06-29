import {
  useListSafeRooms,
  useCheckinSafeRoom,
  useCheckoutSafeRoom,
  getListSafeRoomsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Users, Layers } from "lucide-react";
import { Link } from "wouter";

function statusColor(status: string) {
  if (status === "available") return "bg-green-100 text-green-800 border-green-200";
  if (status === "partially_occupied") return "bg-amber-100 text-amber-800 border-amber-200";
  if (status === "full") return "bg-red-100 text-red-800 border-red-200";
  return "bg-gray-100 text-gray-800 border-gray-200";
}

function statusLabel(status: string) {
  if (status === "available") return "Available";
  if (status === "partially_occupied") return "Partially Occupied";
  if (status === "full") return "Full";
  return "Closed";
}

export default function SafeRooms() {
  const qc = useQueryClient();
  const { data: rooms, isLoading } = useListSafeRooms({
    query: { queryKey: getListSafeRoomsQueryKey() },
  });

  const checkin = useCheckinSafeRoom();
  const checkout = useCheckoutSafeRoom();

  function handleCheckin(id: number) {
    checkin.mutate({ id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListSafeRoomsQueryKey() }) });
  }

  function handleCheckout(id: number) {
    checkout.mutate({ id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListSafeRoomsQueryKey() }) });
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Sensory Safe Rooms</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Quiet and sensory-friendly spaces across Lakewood University
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
{Array.isArray(rooms) && rooms.map((room) => (
              <Card key={room.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{room.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {room.building} — Floor {room.floor}, Room {room.roomNumber}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusColor(room.status)}`}
                  >
                    {statusLabel(room.status)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {room.equipment.map((eq) => (
                    <span key={eq} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      {eq}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {room.openingHours}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> {room.currentOccupancy}/{room.capacity}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1 text-xs"
                    onClick={() => handleCheckin(room.id)}
                    disabled={room.status === "full" || room.status === "closed" || checkin.isPending}
                    aria-label={`Check in to ${room.name}`}
                  >
                    I'm here
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1 gap-1 text-xs"
                    onClick={() => handleCheckout(room.id)}
                    disabled={room.currentOccupancy === 0 || checkout.isPending}
                    aria-label={`Check out of ${room.name}`}
                  >
                    Leaving
                  </Button>
                  <Link href="/navigate">
                    <Button size="sm" className="gap-1 text-xs" aria-label={`Navigate to ${room.name}`}>
                      <MapPin className="h-3.5 w-3.5" /> Navigate
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
