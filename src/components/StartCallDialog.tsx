import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Phone, Loader2 } from "lucide-react";
import { useStartRetellCall, useRetellAgents, useRetellPhoneNumbers } from "@/hooks/useRetell";
import { toast } from "@/hooks/use-toast";

export function StartCallDialog() {
  const [open, setOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedAssistant, setSelectedAssistant] = useState("");
  const [selectedPhoneNumberId, setSelectedPhoneNumberId] = useState("");
  const [customerName, setCustomerName] = useState("");

  const { data: assistants, isLoading: loadingAssistants } = useRetellAgents();
  const { data: phoneNumbers, isLoading: loadingPhoneNumbers } = useRetellPhoneNumbers();
  const startCall = useStartRetellCall();

  // Filter to show only joinbrand agents
  const filteredAssistants = assistants?.filter((assistant: any) =>
    assistant.agent_name?.toLowerCase().includes("joinbrand")
  ) || [];

  // Filter out the specific phone number
  const filteredPhoneNumbers = phoneNumbers?.filter((phone: any) =>
    !phone.phone_number?.includes("447349397671")
  ) || [];

  const handleStartCall = async () => {
    if (!phoneNumber || !selectedAssistant || !selectedPhoneNumberId) {
      toast({
        title: "Missing Information",
        description: "Please select a phone number, assistant, and enter the recipient's number.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get the phone number to use as from_number
      const phoneNumberData = filteredPhoneNumbers?.find(p => p.phone_number_id === selectedPhoneNumberId);
      if (!phoneNumberData) {
        throw new Error("Selected phone number not found");
      }

      // Start the call
      const result = await startCall.mutateAsync({
        agent_id: selectedAssistant,
        from_number: phoneNumberData.phone_number, // Your Retell phone number (caller ID)
        to_number: phoneNumber, // Recipient's phone number
        metadata: {
          source: "dashboard",
          initiatedBy: "user",
          customerName: customerName || undefined,
        },
      });

      toast({
        title: "Call Started",
        description: `Call initiated to ${phoneNumber}. Call ID: ${result.call_id}`,
      });

      // Reset form and close dialog
      setPhoneNumber("");
      setCustomerName("");
      setSelectedAssistant("");
      setSelectedPhoneNumberId("");
      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Call Failed",
        description: error.message || "Failed to start the call. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Phone className="h-4 w-4" />
          Start Call
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Start New Call</DialogTitle>
          <DialogDescription>
            Initiate a new outbound call using Retell AI assistant.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="phoneNumberId">Your Phone Number (Caller ID) *</Label>
            <Select value={selectedPhoneNumberId} onValueChange={setSelectedPhoneNumberId}>
              <SelectTrigger id="phoneNumberId">
                <SelectValue placeholder="Select your phone number" />
              </SelectTrigger>
              <SelectContent>
                {loadingPhoneNumbers ? (
                  <SelectItem value="loading" disabled>
                    Loading phone numbers...
                  </SelectItem>
                ) : filteredPhoneNumbers && filteredPhoneNumbers.length > 0 ? (
                  filteredPhoneNumbers.map((phone) => (
                    <SelectItem key={phone.phone_number_id} value={phone.phone_number_id}>
                      {phone.phone_number}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No phone numbers available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              This is the number that will appear as the caller ID
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="assistant">AI Assistant *</Label>
            <Select value={selectedAssistant} onValueChange={setSelectedAssistant}>
              <SelectTrigger id="assistant">
                <SelectValue placeholder="Select an assistant" />
              </SelectTrigger>
              <SelectContent>
                {loadingAssistants ? (
                  <SelectItem value="loading" disabled>
                    Loading assistants...
                  </SelectItem>
                ) : filteredAssistants && filteredAssistants.length > 0 ? (
                  filteredAssistants.map((assistant) => (
                    <SelectItem key={assistant.agent_id} value={assistant.agent_id}>
                      {assistant.agent_name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No assistants available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              placeholder="+14155551234"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Include country code (e.g., +1 for US)
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="name">Customer Name (Optional)</Label>
            <Input
              id="name"
              placeholder="John Doe"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={startCall.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleStartCall}
            disabled={startCall.isPending || !phoneNumber || !selectedAssistant || !selectedPhoneNumberId}
          >
            {startCall.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Phone className="mr-2 h-4 w-4" />
                Start Call
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

