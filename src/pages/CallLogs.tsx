import { useState, useEffect } from "react";
import { callsApi, assistantsApi } from "@/api/mockApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, Calendar, Filter, Sparkles, Loader2, Save, Volume2 } from "lucide-react";
import { formatDistance } from "date-fns";
import { processAndSaveCall } from "@/services/customerService";
import { analyzeTranscriptWithAI, ExtractedCallData } from "@/services/openai";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function CallLogs() {
  const { toast } = useToast();
  const [calls, setCalls] = useState([]);
  const [assistants, setAssistants] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAssistant, setSelectedAssistant] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedCall, setSelectedCall] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedCallData | null>(null);
  const [showExtractedData, setShowExtractedData] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedAssistant, selectedStatus]);

  const loadData = async () => {
    const [callsData, assistantsData] = await Promise.all([
      callsApi.getAllCalls({ assistant: selectedAssistant, status: selectedStatus }),
      assistantsApi.getAll(),
    ]);
    setCalls(callsData);
    setAssistants(assistantsData);
  };

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      const results = await callsApi.searchCalls(searchQuery);
      setCalls(results);
    } else {
      loadData();
    }
  };

  const handleRowClick = async (call: any) => {
    // Fetch full call details to ensure we have the recording URL
    try {
      const fullCall = await callsApi.getCallById(call.id);
      setSelectedCall(fullCall);
    } catch (error) {
      // If fetching fails, use the call data we already have
      setSelectedCall(call);
    }
    setDrawerOpen(true);
  };

  const handleExtractData = async () => {
    if (!selectedCall) return;

    // Check if transcript is available
    if (!selectedCall.transcript || selectedCall.transcript.trim().length === 0) {
      toast({
        title: "No Transcript Available",
        description: "This call doesn't have a transcript to process.",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);

    try {
      console.log('🤖 Extracting data from transcript...');

      // Extract data with OpenAI
      const extracted = await analyzeTranscriptWithAI(selectedCall.transcript);
      
      setExtractedData(extracted);
      setShowExtractedData(true);

      toast({
        title: "✅ Data Extracted!",
        description: "Important details have been extracted. Review and save to Firebase.",
      });

      console.log('✅ Data extracted:', extracted);
    } catch (error: any) {
      console.error('❌ Error extracting data:', error);
      toast({
        title: "❌ Error",
        description: error.message || "Failed to extract data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveToFirestore = async () => {
    if (!selectedCall || !extractedData) return;

    // Get phone number
    const phoneNumber = selectedCall.phoneNumber || selectedCall.customer?.number;
    if (!phoneNumber) {
      toast({
        title: "No Phone Number",
        description: "This call doesn't have a phone number.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      console.log('💾 Saving to Firestore...');

      // Process and save to Firebase with extracted data
      const result = await processAndSaveCall(
        phoneNumber,
        selectedCall.id,
        selectedCall.transcript,
        selectedCall.duration || 0
      );

      toast({
        title: "✅ Saved!",
        description: `Call data saved to Firebase. Customer: ${result.customer.name || phoneNumber}`,
      });

      setShowExtractedData(false);
      setExtractedData(null);

      console.log('✅ Saved successfully:', result);
    } catch (error: any) {
      console.error('❌ Error saving:', error);
      toast({
        title: "❌ Error",
        description: error.message || "Failed to save data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success/10 text-success border-success/20";
      case "completed":
        return "bg-primary/10 text-primary border-primary/20";
      case "failed":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Call Logs</h1>
        <p className="text-muted-foreground mt-1">View and filter all call records</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by phone, assistant, or transcript..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="flex-1"
                />
                <Button onClick={handleSearch} size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Select value={selectedAssistant} onValueChange={setSelectedAssistant}>
              <SelectTrigger>
                <SelectValue placeholder="All Assistants" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assistants</SelectItem>
                {assistants.map((asst: any) => (
                  <SelectItem key={asst.id} value={asst.id}>
                    {asst.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Calls Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Assistant</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Phone Number</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Duration</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">AI Response</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Time</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((call: any) => (
                  <tr
                    key={call.id}
                    onClick={() => handleRowClick(call)}
                    className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 text-sm font-medium">{call.assistantName}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{call.phoneNumber}</td>
                    <td className="py-3 px-4 text-sm">{call.duration}s</td>
                    <td className="py-3 px-4 text-sm">{call.aiResponseTime}s</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className={getStatusColor(call.status)}>
                        {call.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {formatDistance(new Date(call.timestamp), new Date(), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Call Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedCall && (
            <>
              <SheetHeader>
                <SheetTitle>Call Details</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Assistant</p>
                    <p className="font-medium">{selectedCall.assistantName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant="outline" className={getStatusColor(selectedCall.status)}>
                      {selectedCall.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone Number</p>
                    <p className="font-medium">{selectedCall.phoneNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-medium">{selectedCall.duration}s</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">AI Response Time</p>
                    <p className="font-medium">{selectedCall.aiResponseTime}s</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Converted</p>
                    <p className="font-medium">{selectedCall.converted ? "Yes" : "No"}</p>
                  </div>
                </div>

                {/* Recording */}
                {selectedCall.recordingUrl && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Volume2 className="h-5 w-5 text-primary" />
                        Call Recording
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <audio
                          controls
                          className="w-full h-12"
                          src={selectedCall.recordingUrl}
                          preload="metadata"
                        >
                          Your browser does not support the audio element.
                        </audio>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Duration: {selectedCall.duration}s</span>
                          {selectedCall.recordingUrl && (
                            <a
                              href={selectedCall.recordingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              <span>Download</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">Transcript</p>
                    <Button
                      onClick={handleExtractData}
                      disabled={processing || !selectedCall.transcript || selectedCall.transcript.trim().length === 0}
                      size="sm"
                      className="bg-primary hover:bg-primary/90"
                    >
                      {processing ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                          Extracting...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3 mr-2" />
                          Extract Important Data
                        </>
                      )}
                    </Button>
                  </div>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm">{selectedCall.transcript}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Extracted Data Dialog */}
      <Dialog open={showExtractedData} onOpenChange={setShowExtractedData}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Extracted Important Data</DialogTitle>
            <DialogDescription>
              Review the important details extracted from the call transcript
            </DialogDescription>
          </DialogHeader>
          
          {extractedData && (
            <div className="space-y-6 mt-4">
              {/* Customer Information */}
              {(extractedData.customerName || extractedData.email || extractedData.phone || extractedData.company) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Customer Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {extractedData.customerName && (
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium">{extractedData.customerName}</p>
                      </div>
                    )}
                    {extractedData.email && (
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{extractedData.email}</p>
                      </div>
                    )}
                    {extractedData.phone && (
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{extractedData.phone}</p>
                      </div>
                    )}
                    {extractedData.company && (
                      <div>
                        <p className="text-sm text-muted-foreground">Company</p>
                        <p className="font-medium">{extractedData.company}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Call Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Call Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Intent</p>
                    <Badge variant="outline" className="mt-1">{extractedData.intent}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sentiment</p>
                    <Badge variant="outline" className="mt-1">{extractedData.sentiment}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Summary</p>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{extractedData.summary}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Meeting Times / Scheduled Events */}
              {extractedData.scheduledEvents && extractedData.scheduledEvents.length > 0 && (
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      Meeting Times & Scheduled Events
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {extractedData.scheduledEvents.map((event, index) => (
                        <div key={index} className="border-2 border-primary/20 rounded-lg p-4 space-y-3 bg-primary/5">
                          {/* Date and Time - Prominently Displayed */}
                          {(event.date || event.time) && (
                            <div className="flex items-center justify-between pb-2 border-b border-border">
                              <div className="flex-1">
                                {event.date && (
                                  <p className="text-base font-bold text-foreground">
                                    {(() => {
                                      try {
                                        return new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { 
                                          weekday: 'long', 
                                          year: 'numeric', 
                                          month: 'long', 
                                          day: 'numeric' 
                                        });
                                      } catch {
                                        return event.date;
                                      }
                                    })()}
                                  </p>
                                )}
                                {event.time && (
                                  <p className="text-lg font-semibold text-primary mt-1">
                                    ⏰ {event.time}
                                    {event.timezone && <span className="text-sm text-muted-foreground ml-2">({event.timezone})</span>}
                                  </p>
                                )}
                              </div>
                              <Badge variant="outline" className="text-xs bg-primary/10">
                                {event.type || 'appointment'}
                              </Badge>
                            </div>
                          )}
                          
                          {/* Description */}
                          {event.description && (
                            <div>
                              <p className="text-sm font-medium text-foreground">{event.description}</p>
                            </div>
                          )}
                          
                          {/* Additional Details */}
                          <div className="flex flex-wrap gap-3 text-xs pt-2">
                            {event.location && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <span>📍</span>
                                <span>{event.location}</span>
                              </div>
                            )}
                            {event.duration && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <span>⏱️</span>
                                <span>{event.duration} minutes</span>
                              </div>
                            )}
                            {event.date && event.time && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <span>📆</span>
                                <span>{event.date} at {event.time}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Important Dates */}
              {extractedData.importantDates && extractedData.importantDates.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Important Dates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1">
                      {extractedData.importantDates.map((date, index) => (
                        <li key={index} className="text-sm">{date}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Deadlines */}
              {extractedData.deadlines && extractedData.deadlines.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Deadlines</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1">
                      {extractedData.deadlines.map((deadline, index) => (
                        <li key={index} className="text-sm">{deadline}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Key Points */}
              {extractedData.keyPoints && extractedData.keyPoints.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Key Points</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1">
                      {extractedData.keyPoints.map((point, index) => (
                        <li key={index} className="text-sm">{point}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Action Items */}
              {extractedData.actionItems && extractedData.actionItems.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Action Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1">
                      {extractedData.actionItems.map((item, index) => (
                        <li key={index} className="text-sm">{item}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Next Steps */}
              {extractedData.nextSteps && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Next Steps</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{extractedData.nextSteps}</p>
                  </CardContent>
                </Card>
              )}

              {/* Save Button */}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowExtractedData(false);
                    setExtractedData(null);
                  }}
                >
                  Close
                </Button>
                <Button
                  onClick={handleSaveToFirestore}
                  disabled={saving}
                  className="bg-primary hover:bg-primary/90"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save to Firestore
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
