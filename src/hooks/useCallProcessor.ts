import { useState } from 'react';
import { processAndSaveCall, isCallProcessed } from '@/services/customerService';
import * as retellApi from '@/api/retellApi';

export function useCallProcessor() {
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState({ processed: 0, failed: 0 });

  const processCalls = async () => {
    if (processing) return;

    setProcessing(true);

    try {
      console.log('🔍 Fetching ALL available calls...');
      
      // Fetch all calls using pagination
      let allCalls: any[] = [];
      let offset = 0;
      const limit = 100; // Fetch in batches of 100
      let hasMore = true;

      while (hasMore) {
        console.log(`📥 Fetching calls batch: offset ${offset}, limit ${limit}...`);
        const batch = await retellApi.getAllCalls({ limit, offset });
        
        if (batch.length === 0) {
          hasMore = false;
        } else {
          allCalls = [...allCalls, ...batch];
          offset += batch.length;
          
          // If we got fewer than the limit, we've reached the end
          if (batch.length < limit) {
            hasMore = false;
          }
        }
      }
      
      console.log(`📞 Found ${allCalls.length} total calls from Retell`);
      
      // Filter for ended calls with phone numbers (transcripts are not in list, need to fetch individually)
      const callsToProcess = allCalls.filter(call => {
        const isEnded = call.call_status === 'ended';
        const hasPhoneNumber = call.to_number || call.from_number;
        return isEnded && hasPhoneNumber;
      });
      
      console.log(`📝 Found ${callsToProcess.length} ended calls to check for transcripts`);
      
      if (callsToProcess.length === 0) {
        console.log('ℹ️ No completed calls found');
        setProcessing(false);
        return { processed: 0, failed: 0 };
      }

      let processedCount = 0;
      let failedCount = 0;
      let skippedCount = 0;
      
      // Process each call - fetch individual call to get transcript
      for (const call of callsToProcess) {
        const phoneNumber = call.to_number || call.from_number;
        if (!phoneNumber) {
          console.log(`⏭️ Skipping call ${call.call_id} - no phone number`);
          skippedCount++;
          continue;
        }

        // Check if call has already been processed
        const alreadyProcessed = await isCallProcessed(call.call_id);
        if (alreadyProcessed) {
          console.log(`⏭️ Skipping call ${call.call_id} - already processed`);
          skippedCount++;
          continue;
        }

        try {
          // Fetch individual call to get full details including transcript
          console.log(`🔍 Fetching full details for call ${call.call_id}...`);
          const fullCall = await retellApi.getCallById(call.call_id);
          
          // Check if transcript is available
          if (!fullCall.transcript || fullCall.transcript.trim().length === 0) {
            console.log(`⏭️ Skipping call ${call.call_id} - no transcript available`);
            skippedCount++;
            continue;
          }

          console.log(`🔄 Processing call ${call.call_id} for ${phoneNumber} (transcript: ${fullCall.transcript.length} chars)...`);
          
          // Process and save to Firebase with AI analysis
          await processAndSaveCall(
            phoneNumber,
            fullCall.call_id,
            fullCall.transcript,
            fullCall.duration_ms ? Math.round(fullCall.duration_ms / 1000) : 0
          );

          processedCount++;
          setStats(prev => ({ ...prev, processed: prev.processed + 1 }));
          
          console.log(`✅ Successfully processed call ${fullCall.call_id} for ${phoneNumber}`);
        } catch (error: any) {
          failedCount++;
          console.error(`❌ Failed to process call ${call.call_id}:`, error.message || error);
          setStats(prev => ({ ...prev, failed: prev.failed + 1 }));
        }
      }
      
      if (skippedCount > 0) {
        console.log(`⏭️ Skipped ${skippedCount} call(s) (already processed or no transcript)`);
      }

      if (processedCount > 0) {
        console.log(`✅ Processed ${processedCount} call(s) successfully`);
      }
      if (failedCount > 0) {
        console.log(`⚠️ Failed to process ${failedCount} call(s)`);
      }

      return { processed: processedCount, failed: failedCount };
    } catch (error: any) {
      console.error('❌ Error checking calls:', error.message || error);
      setStats(prev => ({ ...prev, failed: prev.failed + 1 }));
      return { processed: 0, failed: 1 };
    } finally {
      setProcessing(false);
    }
  };

  return {
    processing,
    stats,
    processCalls,
  };
}

