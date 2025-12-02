import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRetellAgent, useRetellCalls, useUpdateRetellAgent, useRetellKnowledgeBase } from "@/hooks/useRetell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft, Phone, Clock, TrendingUp, Save, CheckCircle2, FileText, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function AssistantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: agent, isLoading: loadingAgent } = useRetellAgent(id || "");
  const { data: calls, isLoading: loadingCalls } = useRetellCalls({ agent_id: id });
  const updateAgent = useUpdateRetellAgent();
  
  // Knowledge Base - static ID
  const knowledgeBaseId = "knowledge_base_507068971c7a018c";
  const { data: knowledgeBase, isLoading: loadingKnowledgeBase } = useRetellKnowledgeBase(knowledgeBaseId);

  // Form state
  const [formData, setFormData] = useState({
    agent_name: "",
    voice_id: "",
    language: "",
    responsiveness: 1,
    interruption_sensitivity: 1,
    voice_temperature: 1,
    voice_speed: 1,
    volume: 1,
    webhook_url: "",
    webhook_timeout_ms: 10000,
    stt_mode: "fast" as "fast" | "accurate",
    vocab_specialization: "general" as "general" | "medical",
    denoising_mode: "noise-cancellation" as "noise-cancellation" | "noise-and-background-speech-cancellation",
    data_storage_setting: "everything" as "everything" | "everything_except_pii" | "basic_attributes_only",
  });

  // Initialize form data when agent loads
  useEffect(() => {
    if (agent) {
      setFormData({
        agent_name: agent.agent_name || "",
        voice_id: agent.voice_id || "",
        language: agent.language || "en-US",
        responsiveness: agent.responsiveness ?? 1,
        interruption_sensitivity: agent.interruption_sensitivity ?? 1,
        voice_temperature: agent.voice_temperature ?? 1,
        voice_speed: agent.voice_speed ?? 1,
        volume: agent.volume ?? 1,
        webhook_url: agent.webhook_url || "",
        webhook_timeout_ms: agent.webhook_timeout_ms ?? 10000,
        stt_mode: agent.stt_mode || "fast",
        vocab_specialization: agent.vocab_specialization || "general",
        denoising_mode: agent.denoising_mode || "noise-cancellation",
        data_storage_setting: agent.data_storage_setting || "everything",
      });
    }
  }, [agent]);

  // Calculate statistics from calls
  const stats = calls
    ? {
        totalCalls: calls.length,
        completedCalls: calls.filter((call) => call.call_status === "ended").length,
        avgDuration: (() => {
          const completed = calls.filter((call) => call.call_status === "ended" && call.duration_ms);
          if (completed.length === 0) return 0;
          const totalMs = completed.reduce((sum, call) => sum + (call.duration_ms || 0), 0);
          return Math.round(totalMs / completed.length / 1000); // Convert to seconds
        })(),
        conversionRate: (() => {
          const converted = calls.filter((call) => call.metadata?.converted === true).length;
          return calls.length > 0 ? parseFloat(((converted / calls.length) * 100).toFixed(1)) : 0;
        })(),
      }
    : { totalCalls: 0, completedCalls: 0, avgDuration: 0, conversionRate: 0 };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!id) return;

    try {
      // Clean up the payload: convert empty strings to null for URL fields
      const payload: any = { ...formData };
      
      // Convert empty webhook_url to null (API expects null, not empty string)
      if (payload.webhook_url === "") {
        payload.webhook_url = null;
    }
      
      // Remove empty string values for optional fields
      Object.keys(payload).forEach((key) => {
        if (payload[key] === "" && key !== "agent_name") {
          delete payload[key];
        }
      });

      await updateAgent.mutateAsync({
        agentId: id,
        payload,
      });

      toast({
        title: "Agent Updated",
        description: "Agent information has been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update agent",
        variant: "destructive",
      });
    }
  };

  if (loadingAgent) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading assistant details...</span>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/assistants")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Assistants
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Assistant not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/assistants")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex-1">
        <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">{agent.agent_name}</h1>
            <Badge variant="outline" className="bg-success/10 text-success border-success/20">
              Active
          </Badge>
        </div>
        <p className="text-muted-foreground mt-1">Configure and monitor your AI assistant</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="edit">Edit Agent</TabsTrigger>
          <TabsTrigger value="knowledgeBase">Knowledge Base</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
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
                    {loadingCalls ? (
                      <Loader2 className="h-5 w-5 animate-spin mt-1" />
                    ) : (
                      <p className="text-2xl font-bold">{stats.totalCalls.toLocaleString()}</p>
                    )}
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
                    {loadingCalls ? (
                      <Loader2 className="h-5 w-5 animate-spin mt-1" />
                    ) : (
                      <p className="text-2xl font-bold">{stats.avgDuration}s</p>
                    )}
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
                    {loadingCalls ? (
                      <Loader2 className="h-5 w-5 animate-spin mt-1" />
                    ) : (
                      <p className="text-2xl font-bold">{stats.conversionRate}%</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Agent Details */}
          <Card>
            <CardHeader>
              <CardTitle>Agent Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
              <div>
                  <Label className="text-muted-foreground">Agent ID</Label>
                  <p className="font-medium text-sm break-all">{agent.agent_id}</p>
                </div>
                {agent.version !== undefined && (
                  <div>
                    <Label className="text-muted-foreground">Version</Label>
                    <p className="font-medium">{agent.version}</p>
                  </div>
                )}
                {agent.is_published !== undefined && (
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <Badge variant={agent.is_published ? "default" : "secondary"}>
                      {agent.is_published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                )}
                {agent.response_engine && (
                  <div>
                    <Label className="text-muted-foreground">Response Engine</Label>
                    <p className="font-medium text-sm">
                      {agent.response_engine.type}
                      {agent.response_engine.llm_id && ` (${agent.response_engine.llm_id})`}
                    </p>
                  </div>
                )}
                {agent.voice_id && (
                  <div>
                    <Label className="text-muted-foreground">Voice ID</Label>
                    <p className="font-medium">{agent.voice_id}</p>
                  </div>
                )}
                {agent.voice_model && (
                  <div>
                    <Label className="text-muted-foreground">Voice Model</Label>
                    <p className="font-medium text-sm">{agent.voice_model}</p>
                  </div>
                )}
                {agent.language && (
                  <div>
                    <Label className="text-muted-foreground">Language</Label>
                    <p className="font-medium">{agent.language}</p>
              </div>
                )}
                {agent.data_storage_setting && (
              <div>
                    <Label className="text-muted-foreground">Data Storage</Label>
                    <Badge variant="outline">{agent.data_storage_setting}</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Edit Agent Tab */}
        <TabsContent value="edit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Edit Agent</CardTitle>
              <CardDescription>Update agent configuration and settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="agent_name">Agent Name *</Label>
                    <Input
                      id="agent_name"
                      value={formData.agent_name}
                      onChange={(e) => handleInputChange("agent_name", e.target.value)}
                      placeholder="Enter agent name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="voice_id">Voice ID</Label>
                    <Input
                      id="voice_id"
                      value={formData.voice_id}
                      onChange={(e) => handleInputChange("voice_id", e.target.value)}
                      placeholder="e.g., 11labs-Adrian"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select
                      value={formData.language}
                      onValueChange={(value) => handleInputChange("language", value)}
                    >
                      <SelectTrigger id="language">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en-US">English (US)</SelectItem>
                        <SelectItem value="en-GB">English (UK)</SelectItem>
                        <SelectItem value="en-AU">English (Australia)</SelectItem>
                        <SelectItem value="es-ES">Spanish (Spain)</SelectItem>
                        <SelectItem value="es-419">Spanish (Latin America)</SelectItem>
                        <SelectItem value="fr-FR">French</SelectItem>
                        <SelectItem value="de-DE">German</SelectItem>
                        <SelectItem value="ja-JP">Japanese</SelectItem>
                        <SelectItem value="zh-CN">Chinese</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="data_storage_setting">Data Storage Setting</Label>
                    <Select
                      value={formData.data_storage_setting}
                      onValueChange={(value) => handleInputChange("data_storage_setting", value)}
                    >
                      <SelectTrigger id="data_storage_setting">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="everything">Everything</SelectItem>
                        <SelectItem value="everything_except_pii">Everything Except PII</SelectItem>
                        <SelectItem value="basic_attributes_only">Basic Attributes Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Voice Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Voice Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="voice_temperature">Voice Temperature (0-2)</Label>
                    <Input
                      id="voice_temperature"
                      type="number"
                      min="0"
                      max="2"
                      step="0.1"
                      value={formData.voice_temperature}
                      onChange={(e) => handleInputChange("voice_temperature", parseFloat(e.target.value) || 1)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="voice_speed">Voice Speed (0.5-2)</Label>
                    <Input
                      id="voice_speed"
                      type="number"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={formData.voice_speed}
                      onChange={(e) => handleInputChange("voice_speed", parseFloat(e.target.value) || 1)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="volume">Volume (0-1)</Label>
                    <Input
                      id="volume"
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={formData.volume}
                      onChange={(e) => handleInputChange("volume", parseFloat(e.target.value) || 1)}
                    />
                  </div>
                </div>
              </div>

              {/* Conversation Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Conversation Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="responsiveness">Responsiveness (0-1)</Label>
                    <Input
                      id="responsiveness"
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={formData.responsiveness}
                      onChange={(e) => handleInputChange("responsiveness", parseFloat(e.target.value) || 1)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="interruption_sensitivity">Interruption Sensitivity (0-1)</Label>
                  <Input
                      id="interruption_sensitivity"
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={formData.interruption_sensitivity}
                      onChange={(e) => handleInputChange("interruption_sensitivity", parseFloat(e.target.value) || 1)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stt_mode">STT Mode</Label>
                    <Select
                      value={formData.stt_mode}
                      onValueChange={(value) => handleInputChange("stt_mode", value)}
                    >
                      <SelectTrigger id="stt_mode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fast">Fast</SelectItem>
                        <SelectItem value="accurate">Accurate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vocab_specialization">Vocabulary Specialization</Label>
                    <Select
                      value={formData.vocab_specialization}
                      onValueChange={(value) => handleInputChange("vocab_specialization", value)}
                    >
                      <SelectTrigger id="vocab_specialization">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="medical">Medical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="denoising_mode">Denoising Mode</Label>
                    <Select
                      value={formData.denoising_mode}
                      onValueChange={(value) => handleInputChange("denoising_mode", value)}
                    >
                      <SelectTrigger id="denoising_mode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="noise-cancellation">Noise Cancellation</SelectItem>
                        <SelectItem value="noise-and-background-speech-cancellation">
                          Noise and Background Speech Cancellation
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Webhook Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Webhook Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="webhook_url">Webhook URL</Label>
                  <Input
                      id="webhook_url"
                    type="url"
                      value={formData.webhook_url}
                      onChange={(e) => handleInputChange("webhook_url", e.target.value)}
                      placeholder="https://your-webhook-url.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="webhook_timeout_ms">Webhook Timeout (ms)</Label>
                    <Input
                      id="webhook_timeout_ms"
                      type="number"
                      min="1000"
                      step="1000"
                      value={formData.webhook_timeout_ms}
                      onChange={(e) => handleInputChange("webhook_timeout_ms", parseInt(e.target.value) || 10000)}
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  onClick={handleSave}
                  disabled={updateAgent.isPending}
                  className="gap-2"
                >
                  {updateAgent.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
              </Button>
              </div>

              {updateAgent.isSuccess && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Agent updated successfully
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Knowledge Base Tab */}
        <TabsContent value="knowledgeBase" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Knowledge Base</CardTitle>
              <CardDescription>
                View and manage knowledge base files for this agent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingKnowledgeBase ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading knowledge base...</span>
                </div>
              ) : knowledgeBase ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Knowledge Base ID</Label>
                      <p className="font-medium text-sm break-all">{knowledgeBase.knowledge_base_id}</p>
                    </div>
                    {knowledgeBase.knowledge_base_name && (
                      <div>
                        <Label className="text-muted-foreground">Name</Label>
                        <p className="font-medium">{knowledgeBase.knowledge_base_name}</p>
                      </div>
                    )}
                    {knowledgeBase.created_at && (
                      <div>
                        <Label className="text-muted-foreground">Created At</Label>
                        <p className="font-medium text-sm">
                          {new Date(knowledgeBase.created_at * 1000).toLocaleString()}
                        </p>
                      </div>
                    )}
                    {knowledgeBase.updated_at && (
                      <div>
                        <Label className="text-muted-foreground">Updated At</Label>
                        <p className="font-medium text-sm">
                          {new Date(knowledgeBase.updated_at * 1000).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {knowledgeBase.knowledge_base_sources && knowledgeBase.knowledge_base_sources.length > 0 ? (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-lg font-semibold">Files & Sources</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {knowledgeBase.knowledge_base_sources.length} source{knowledgeBase.knowledge_base_sources.length !== 1 ? "s" : ""} in knowledge base
                        </p>
                      </div>
                      <div className="space-y-2">
                        {knowledgeBase.knowledge_base_sources.map((source, index) => (
                          <Card key={source.source_id || index} className="border">
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">
                                      {source.filename || source.url || source.source_id || `Source ${index + 1}`}
                                    </span>
                                    <Badge variant="outline" className="text-xs">
                                      {source.type}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    {source.source_id && (
                                      <span className="text-xs break-all">ID: {source.source_id}</span>
                                    )}
                                    {source.file_size && (
                                      <span>
                                        Size: {(source.file_size / 1024).toFixed(2)} KB
                                      </span>
                                    )}
                                    {source.created_at && (
                                      <span>
                                        Added: {new Date(source.created_at * 1000).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                  {(source.file_url || source.url) && (
                                    <div className="flex items-center gap-2">
                                      <a
                                        href={source.file_url || source.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-primary hover:underline flex items-center gap-1"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                        {source.type === "url" ? "Visit URL" : "View File"}
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        <p>No files or sources found in this knowledge base.</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <p>No knowledge base found.</p>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Voice Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Voice Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {agent.voice_temperature !== undefined && (
                  <div>
                    <Label>Voice Temperature</Label>
                    <p className="text-sm text-muted-foreground mt-1">{agent.voice_temperature}</p>
                  </div>
                )}
                {agent.voice_speed !== undefined && (
                  <div>
                    <Label>Voice Speed</Label>
                    <p className="text-sm text-muted-foreground mt-1">{agent.voice_speed}x</p>
                  </div>
                )}
                {agent.volume !== undefined && (
                  <div>
                    <Label>Volume</Label>
                    <p className="text-sm text-muted-foreground mt-1">{agent.volume}</p>
                  </div>
                )}
                {agent.fallback_voice_ids && agent.fallback_voice_ids.length > 0 && (
                  <div>
                    <Label>Fallback Voice IDs</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {agent.fallback_voice_ids.map((id, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {id}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Conversation Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Conversation Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {agent.responsiveness !== undefined && (
                  <div>
                    <Label>Responsiveness</Label>
                    <p className="text-sm text-muted-foreground mt-1">{agent.responsiveness}</p>
                  </div>
                )}
                {agent.interruption_sensitivity !== undefined && (
                  <div>
                    <Label>Interruption Sensitivity</Label>
                    <p className="text-sm text-muted-foreground mt-1">{agent.interruption_sensitivity}</p>
                  </div>
                )}
                {agent.enable_backchannel !== undefined && (
                  <div>
                    <Label>Backchannel</Label>
                    <Badge variant={agent.enable_backchannel ? "default" : "secondary"}>
                      {agent.enable_backchannel ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                )}
                {agent.stt_mode && (
                  <div>
                    <Label>STT Mode</Label>
                    <Badge variant="outline">{agent.stt_mode}</Badge>
                  </div>
                )}
                {agent.vocab_specialization && (
                  <div>
                    <Label>Vocabulary Specialization</Label>
                    <Badge variant="outline">{agent.vocab_specialization}</Badge>
                  </div>
                )}
                {agent.denoising_mode && (
                  <div>
                    <Label>Denoising Mode</Label>
                    <Badge variant="outline">{agent.denoising_mode}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Call Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Call Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {agent.webhook_url && (
                  <div>
                    <Label>Webhook URL</Label>
                    <p className="text-sm text-muted-foreground mt-1 break-all">{agent.webhook_url}</p>
                  </div>
                )}
                {agent.webhook_timeout_ms && (
                  <div>
                    <Label>Webhook Timeout</Label>
                    <p className="text-sm text-muted-foreground mt-1">{agent.webhook_timeout_ms}ms</p>
                  </div>
                )}
                {agent.max_call_duration_ms && (
                  <div>
                    <Label>Max Call Duration</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {Math.round(agent.max_call_duration_ms / 1000 / 60)} minutes
                    </p>
                  </div>
                )}
                {agent.end_call_after_silence_ms && (
                  <div>
                    <Label>End Call After Silence</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {Math.round(agent.end_call_after_silence_ms / 1000)} seconds
                    </p>
                  </div>
                )}
                {agent.ring_duration_ms && (
                  <div>
                    <Label>Ring Duration</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {Math.round(agent.ring_duration_ms / 1000)} seconds
                    </p>
                  </div>
                )}
                {agent.begin_message_delay_ms && (
                  <div>
                    <Label>Begin Message Delay</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {Math.round(agent.begin_message_delay_ms / 1000)} seconds
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Advanced Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Advanced Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {agent.boosted_keywords && agent.boosted_keywords.length > 0 && (
                  <div>
                    <Label>Boosted Keywords</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {agent.boosted_keywords.map((keyword, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {agent.post_call_analysis_model && (
                  <div>
                    <Label>Post-Call Analysis Model</Label>
                    <p className="text-sm text-muted-foreground mt-1">{agent.post_call_analysis_model}</p>
                  </div>
                )}
                {agent.ambient_sound && (
                  <div>
                    <Label>Ambient Sound</Label>
                    <Badge variant="outline">{agent.ambient_sound}</Badge>
                  </div>
                )}
                {agent.llm_websocket_url && (
                  <div>
                    <Label>LLM WebSocket URL</Label>
                    <p className="text-sm text-muted-foreground mt-1 break-all text-xs">{agent.llm_websocket_url}</p>
                  </div>
                )}
                {agent.last_modification_timestamp && (
                  <div>
                    <Label>Last Modified</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(agent.last_modification_timestamp).toLocaleString()}
                    </p>
                  </div>
                )}
                {agent.created_at && (
                  <div>
                    <Label>Created At</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(agent.created_at * 1000).toLocaleString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
