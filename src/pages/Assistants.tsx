import { Link } from "react-router-dom";
import { useRetellAgents } from "@/hooks/useRetell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, Loader2 } from "lucide-react";

export default function Assistants() {
  const { data: assistants, isLoading } = useRetellAgents();

  // Deduplicate agents by agent_id (in case API returns multiple versions)
  // Keep only unique agents based on agent_id
  const uniqueAssistants = assistants
    ? assistants.filter((assistant: any, index: number, self: any[]) =>
        index === self.findIndex((a: any) => a.agent_id === assistant.agent_id)
      )
    : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-bold text-foreground">AI Assistants</h1>
        <p className="text-muted-foreground mt-1">View your Retell AI voice agents</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading agents...</span>
        </div>
      ) : uniqueAssistants && uniqueAssistants.length > 0 ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {uniqueAssistants.map((assistant: any) => (
            <Card key={assistant.agent_id} className="shadow-md hover:shadow-lg transition-all group">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                    <CardTitle className="text-xl">{assistant.agent_name}</CardTitle>
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20 mt-2">
                      Active
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  {assistant.voice_id && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Voice:</span>
                      <span className="font-medium">{assistant.voice_id}</span>
                  </div>
                  )}
                  {assistant.language && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Language:</span>
                      <span className="font-medium">{assistant.language}</span>
                </div>
                  )}
                  {assistant.enable_transcription !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Transcription:</span>
                      <Badge variant={assistant.enable_transcription ? "default" : "secondary"}>
                        {assistant.enable_transcription ? "Enabled" : "Disabled"}
                      </Badge>
                  </div>
                  )}
                  {assistant.enable_recording !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Recording:</span>
                      <Badge variant={assistant.enable_recording ? "default" : "secondary"}>
                        {assistant.enable_recording ? "Enabled" : "Disabled"}
                      </Badge>
                </div>
                  )}
              </div>

                <Link to={`/assistants/${assistant.agent_id}`}>
                <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  View Details
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No agents found. Create an agent in the Retell AI dashboard.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
