import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { assistantsApi } from "@/api/mockApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Phone, Clock, TrendingUp, Upload, Link as LinkIcon, Save } from "lucide-react";

export default function AssistantDetail() {
  const { id } = useParams();
  const [assistant, setAssistant] = useState<any>(null);
  const [knowledgeBase, setKnowledgeBase] = useState("");
  const [calendlyLink, setCalendlyLink] = useState("");

  useEffect(() => {
    loadAssistant();
  }, [id]);

  const loadAssistant = async () => {
    if (id) {
      const data = await assistantsApi.getById(id);
      setAssistant(data);
      setKnowledgeBase(data?.knowledgeBase || "");
      setCalendlyLink(data?.calendlyLink || "");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && id) {
      await assistantsApi.uploadKnowledgeBase(id, file);
      toast.success(`File "${file.name}" uploaded successfully`);
    }
  };

  const handleSaveKnowledgeBase = async () => {
    if (id) {
      await assistantsApi.update(id, { knowledgeBase });
      toast.success("Knowledge base updated");
    }
  };

  const handleSaveIntegrations = async () => {
    if (id) {
      await assistantsApi.update(id, { calendlyLink });
      toast.success("Integrations updated");
    }
  };

  if (!assistant) {
    return <div>Loading...</div>;
  }

  const getStatusColor = (status: string) => {
    return status === "active"
      ? "bg-success/10 text-success border-success/20"
      : "bg-muted text-muted-foreground border-border";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-foreground">{assistant.name}</h1>
          <Badge variant="outline" className={getStatusColor(assistant.status)}>
            {assistant.status}
          </Badge>
        </div>
        <p className="text-muted-foreground mt-1">Configure and monitor your AI assistant</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Phone className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Calls</p>
                    <p className="text-2xl font-bold">{assistant.totalCalls.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-secondary/10">
                    <Clock className="h-6 w-6 text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Duration</p>
                    <p className="text-2xl font-bold">{assistant.avgDuration}s</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-success/10">
                    <TrendingUp className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Conversion Rate</p>
                    <p className="text-2xl font-bold">{assistant.conversionRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Knowledge Base Tab */}
        <TabsContent value="knowledge" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Knowledge Base Content</CardTitle>
              <CardDescription>Upload files or edit the knowledge base text directly</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="file-upload">Upload File</Label>
                <div className="mt-2 flex items-center gap-4">
                  <Input
                    id="file-upload"
                    type="file"
                    onChange={handleFileUpload}
                    className="flex-1"
                  />
                  <Button variant="outline" size="icon">
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="kb-text">Knowledge Base Text</Label>
                <Textarea
                  id="kb-text"
                  value={knowledgeBase}
                  onChange={(e) => setKnowledgeBase(e.target.value)}
                  rows={10}
                  className="mt-2"
                  placeholder="Enter knowledge base content..."
                />
              </div>

              <Button onClick={handleSaveKnowledgeBase} className="gap-2">
                <Save className="h-4 w-4" />
                Save Knowledge Base
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Calendly Integration</CardTitle>
              <CardDescription>Connect your Calendly account for automated scheduling</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="calendly">Calendly Link</Label>
                <div className="mt-2 flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="calendly"
                    type="url"
                    value={calendlyLink}
                    onChange={(e) => setCalendlyLink(e.target.value)}
                    placeholder="https://calendly.com/your-link"
                    className="flex-1"
                  />
                </div>
              </div>

              <Button onClick={handleSaveIntegrations} className="gap-2">
                <Save className="h-4 w-4" />
                Save Integrations
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
