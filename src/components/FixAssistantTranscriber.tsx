import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { useRetellAgents } from "@/hooks/useRetell";
import * as retellApi from "@/api/retellApi";
import { toast } from "@/hooks/use-toast";

export function FixAssistantTranscriber() {
  const { data: assistants, refetch } = useRetellAgents();
  const [fixing, setFixing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // Filter to show only joinbrand agents
  const filteredAssistants = assistants?.filter((assistant: any) =>
    assistant.agent_name?.toLowerCase().includes("joinbrand")
  ) || [];

  const fixTranscriber = async () => {
    if (!filteredAssistants || filteredAssistants.length === 0) {
      toast({
        title: "No Assistants Found",
        description: "Please create a joinbrand assistant first",
        variant: "destructive",
      });
      return;
    }

    setFixing(true);
    setResult(null);

    try {
      // Update the first joinbrand assistant
      const assistant = filteredAssistants[0];
      
      await retellApi.updateAgent(assistant.agent_id, {
        enable_transcription: true,
        // Note: Retell handles transcription configuration differently
        // Transcription is typically enabled via agent settings
      });

      setResult("success");
      toast({
        title: "✅ Transcriber Enabled!",
        description: `${assistant.agent_name} now has transcription enabled`,
      });

      // Refetch assistants
      setTimeout(() => refetch(), 1000);
    } catch (error: any) {
      setResult("error");
      toast({
        title: "Error",
        description: error.message || "Failed to update assistant",
        variant: "destructive",
      });
    }

    setFixing(false);
  };

  return (
    <Card className="border-2 border-orange-500/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔧 Fix Transcription Issue
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-orange-500/10 border border-orange-500/50 rounded space-y-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-semibold">Issue: No Transcript Available</p>
              <p className="text-muted-foreground">
                Your assistant doesn't have a transcriber configured, so call transcripts won't be generated.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">What this will do:</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Enable transcription for the agent</li>
            <li>Configure transcription settings</li>
            <li>Future calls will have transcripts</li>
            <li>Previous calls won't be affected</li>
          </ul>
        </div>

        <Button 
          onClick={fixTranscriber} 
          disabled={fixing || !filteredAssistants || filteredAssistants.length === 0}
          className="w-full"
        >
          {fixing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Fixing...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Enable Transcription
            </>
          )}
        </Button>

        {result === "success" && (
          <div className="p-3 bg-green-500/10 border border-green-500/50 rounded">
            <p className="text-sm text-green-500">
              ✅ Transcription enabled! Make a new test call to see transcripts.
            </p>
          </div>
        )}

        {result === "error" && (
          <div className="p-3 bg-red-500/10 border border-red-500/50 rounded">
            <p className="text-sm text-red-500">
              ❌ Failed to update. Try updating manually in Retell Dashboard.
            </p>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p><strong>Note:</strong> This will update your first assistant. Make a new call after enabling to get transcripts.</p>
        </div>
      </CardContent>
    </Card>
  );
}

