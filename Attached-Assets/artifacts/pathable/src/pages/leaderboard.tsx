import { useGetLeaderboard, getGetLeaderboardQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Medal, Award } from "lucide-react";

function rankIcon(rank: number) {
  if (rank === 1) return <Trophy className="h-5 w-5 text-amber-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
  if (rank === 3) return <Award className="h-5 w-5 text-amber-700" />;
  return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{rank}</span>;
}

export default function Leaderboard() {
  const { data: leaderboard, isLoading } = useGetLeaderboard({
    query: { queryKey: getGetLeaderboardQueryKey() },
  });

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Top Contributors</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Students making campus more accessible this month
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
{Array.isArray(leaderboard) && leaderboard.map((entry) => (
            <Card
              key={entry.rank}
              className={entry.rank <= 3 ? "border-primary/30 bg-primary/5" : ""}
            >
              <CardContent className="p-3.5 flex items-center gap-4">
                <div className="flex items-center justify-center w-8 shrink-0">
                  {rankIcon(entry.rank)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{entry.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.badgeCount} badge{entry.badgeCount !== 1 ? "s" : ""} earned
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">{entry.points}</p>
                  <p className="text-xs text-muted-foreground">pts</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-muted rounded-xl">
        <p className="text-sm font-semibold text-foreground mb-2">How to earn points</p>
        <div className="space-y-1.5">
          {[
            ["Submit a report", "+5 pts"],
            ["Confirm another report", "+3 pts"],
            ["Get 3 confirmations", "+15 pts"],
            ["Complete 5 routes", "+10 pts"],
            ["Use app 5 days in a row", "+20 pts"],
          ].map(([action, pts]) => (
            <div key={action} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{action}</span>
              <span className="font-semibold text-primary">{pts}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
