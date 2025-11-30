import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, Play } from 'lucide-react';
import { processAndSaveCall } from '@/services/customerService';
import * as retellApi from '@/api/retellApi';
import { toast } from '@/hooks/use-toast';

/**
 * Manual tool to process a specific call by ID
 */
export function ManualCallProcessor() {
  const [callId, setCallId] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const processCall = async () => {
    if (!callId.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a call ID',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);
    setResult(null);

    try {
      console.log('🔍 Fetching call:', callId);
      
      // Get the call from Retell
      const call = await retellApi.getCallById(callId);
      
      if (!call) {
        throw new Error('Call not found');
      }

      if (!call.transcript || call.transcript.trim().length === 0) {
        throw new Error('Call has no transcript. Make sure transcription is enabled.');
      }

      const phoneNumber = call.to_number || call.from_number;
      if (!phoneNumber) {
        throw new Error('Call has no phone number');
      }

      console.log('📞 Processing call:', {
        id: call.call_id,
        phoneNumber,
        duration: call.duration_ms ? Math.round(call.duration_ms / 1000) : 0,
        transcriptLength: call.transcript.length,
      });

      // Process and save
      const saved = await processAndSaveCall(
        phoneNumber,
        call.call_id,
        call.transcript,
        call.duration_ms ? Math.round(call.duration_ms / 1000) : 0
      );

      setResult({
        success: true,
        customer: saved.customer,
        callRecord: saved.callRecord,
      });

      toast({
        title: '✅ Success!',
        description: `Call processed and saved to Firebase. Customer: ${saved.customer.name || phoneNumber}`,
      });

      console.log('✅ Call processed successfully:', saved);
    } catch (error: any) {
      console.error('❌ Error processing call:', error);
      setResult({
        success: false,
        error: error.message || 'Unknown error',
      });

      toast({
        title: '❌ Error',
        description: error.message || 'Failed to process call',
        variant: 'destructive',
      });
    }

    setProcessing(false);
  };

  return (
    <Card className="border-orange-500/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Play className="h-4 w-4" />
          Manual Call Processor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="callId">Retell Call ID</Label>
          <div className="flex gap-2">
            <Input
              id="callId"
              placeholder="retell-call-xxxxx"
              value={callId}
              onChange={(e) => setCallId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !processing && processCall()}
            />
            <Button onClick={processCall} disabled={processing || !callId.trim()}>
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Process
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter a Retell call ID to manually process and save it to Firebase
          </p>
        </div>

        {result && (
          <div className="space-y-2">
            {result.success ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-semibold">✅ Call processed successfully!</p>
                    <p className="text-xs">
                      Customer: {result.customer.name || result.customer.phoneNumber}
                    </p>
                    <p className="text-xs">
                      Call ID: {result.callRecord.id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Check Firebase Firestore to see the saved data
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold">❌ Failed to process call</p>
                  <p className="text-xs">{result.error}</p>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>How to get Call ID:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Go to Call Logs page</li>
            <li>Click on a call to see details</li>
            <li>Copy the call ID from the details</li>
            <li>Or check browser console for call IDs</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

