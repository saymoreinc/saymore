import { useActiveRetellCalls, useEndRetellCall } from "@/hooks/useRetell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Circle, PhoneOff } from "lucide-react";
import { formatDistance } from "date-fns";
import { toast } from "@/hooks/use-toast";

export function ActiveCallsWidget({ enablePolling = false }: { enablePolling?: boolean }) {
  // Only enable polling when explicitly needed (e.g., on a dedicated monitoring page)
  const { data: activeCalls, isLoading } = useActiveRetellCalls(enablePolling);
  const endCall = useEndRetellCall();

  const handleEndCall = async (callId: string) => {
    try {
      await endCall.mutateAsync(callId);
      toast({
        title: "Call Ended",
        description: `Call ${callId} has been ended successfully.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to end the call.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ongoing":
        return "bg-success/10 text-success border-success/20";
      case "ringing":
        return "bg-warning/10 text-warning border-warning/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Circle className="h-4 w-4 text-success animate-pulse" />
          Active Calls ({activeCalls?.length || 0})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading active calls...</p>
        ) : activeCalls && activeCalls.length > 0 ? (
          <div className="space-y-3">
            {activeCalls.map((call) => (
              <div
                key={call.call_id}
                className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium">
                      {call.to_number || call.from_number || "Unknown"}
                    </p>
                    <Badge variant="outline" className={getStatusColor(call.call_status || "")}>
                      {call.call_status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {call.start_timestamp &&
                      `Started ${formatDistance(new Date(call.start_timestamp), new Date(), {
                        addSuffix: true,
                      })}`}
                  </p>
                  {call.metadata?.customerName && (
                    <p className="text-xs text-muted-foreground">Customer: {call.metadata.customerName}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleEndCall(call.call_id)}
                  disabled={endCall.isPending}
                  className="ml-2"
                >
                  <PhoneOff className="h-3 w-3 mr-1" />
                  End
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No active calls at the moment.</p>
        )}
      </CardContent>
    </Card>
  );
}

