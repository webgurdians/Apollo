import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { RefreshCw, Clock, User } from "lucide-react";
import { format } from "date-fns";

const actionColors: Record<string, string> = {
  create: "text-green-600 bg-green-50",
  update: "text-blue-600 bg-blue-50",
  delete: "text-red-600 bg-red-50",
  restore: "text-purple-600 bg-purple-50",
  login: "text-gray-600 bg-gray-50",
  logout: "text-gray-600 bg-gray-50",
  payment: "text-emerald-600 bg-emerald-50",
  refund: "text-orange-600 bg-orange-50",
  backup: "text-indigo-600 bg-indigo-50",
  restore_system: "text-red-600 bg-red-50",
};

export function ActivityLogView() {
  const [limit, setLimit] = useState(100);
  const { data, isLoading, refetch } = trpc.activity.list.useQuery({ limit, offset: 0 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Activity Log</h3>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading activity log...</div>
      ) : !data?.logs.length ? (
        <div className="text-center py-8 text-muted-foreground">No activity recorded yet.</div>
      ) : (
        <div className="space-y-2">
          {data.logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-white border">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${actionColors[log.action] || "text-gray-600 bg-gray-50"}`}>
                {log.action === "login" || log.action === "logout" ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm">
                  <span className="font-medium">{log.userName}</span>
                  <span className="text-muted-foreground"> {log.action}d </span>
                  <span className="font-medium">{log.entity}</span>
                  {log.entityId && <span className="text-muted-foreground"> #{log.entityId}</span>}
                </div>
                {log.details && (
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">{log.details}</div>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  {format(new Date(log.createdAt), "MMM d, yyyy h:mm a")}
                </div>
              </div>
              <span className="text-xs capitalize px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0">
                {log.action}
              </span>
            </div>
          ))}
        </div>
      )}

      {data && data.total > limit && (
        <div className="text-center">
          <Button variant="link" onClick={() => setLimit((l) => l + 100)}>
            Show more ({data.total - limit} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}
