import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useCallProcessor } from '@/hooks/useCallProcessor';

/**
 * Automatically processes completed calls and saves to Firebase
 */
export function CallProcessor() {
  const { processing, stats, processCalls } = useCallProcessor();

  useEffect(() => {
    // Check for new completed calls every 30 seconds
    const interval = setInterval(() => {
      processCalls();
    }, 30000);
    
    // Run once on mount
    processCalls();

    return () => clearInterval(interval);
  }, [processCalls]);

  return (
    <Card className="border-blue-500/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            {processing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            )}
            Auto Call Processor
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={processCalls}
            disabled={processing}
          >
            {processing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              'Process Now'
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-4 text-xs">
          <div>
            <span className="text-muted-foreground">Processed:</span>{' '}
            <Badge variant="outline" className="ml-1">{stats.processed}</Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Failed:</span>{' '}
            <Badge variant="outline" className="ml-1">{stats.failed}</Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Automatically processes completed calls every 30 seconds and saves to Firebase.
          Click "Process Now" to check immediately.
        </p>
      </CardContent>
    </Card>
  );
}

