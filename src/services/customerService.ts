import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { analyzeTranscriptWithAI, generateCustomerContext, ExtractedCallData, ScheduledEvent, analyzeAllTranscriptsForQuestions, QuestionStats } from '@/services/openai';
import retellApi from '@/api/retellApi';

export interface Customer {
  id: string;
  phoneNumber: string;
  name?: string;
  email?: string;
  company?: string;
  totalCalls: number;
  lastCallDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface CallRecord {
  id: string;
  customerId: string;
  phoneNumber: string;
  retellCallId: string;
  date: Date;
  duration: number;
  transcript: string;
  extractedData: ExtractedCallData;
  status: 'completed' | 'failed' | 'no-answer';
}

const CUSTOMERS_COLLECTION = 'customers';
const CALLS_COLLECTION = 'calls';
const SCHEDULED_EVENTS_COLLECTION = 'scheduledEvents';

/**
 * Normalize phone number for lookup (remove spaces, dashes, etc.)
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  return phone.replace(/[^\d+]/g, '');
}

/**
 * Get customer by phone number (tries multiple formats)
 */
export async function getCustomerByPhone(phoneNumber: string): Promise<Customer | null> {
  try {
    // IMPORTANT: We ONLY look up by phone number, NEVER by name
    // Normalize the phone number
    const normalized = normalizePhoneNumber(phoneNumber);
    console.log('🔍 Looking up customer by PHONE NUMBER ONLY:', phoneNumber, '→ normalized:', normalized);
    console.log('⚠️ NOT using name for lookup - phone number only');
    
    // Try exact match first
    let q = query(
      collection(db, CUSTOMERS_COLLECTION),
      where('phoneNumber', '==', phoneNumber),
      limit(1)
    );
    
    let snapshot = await getDocs(q);
    
    // If not found, try normalized version
    if (snapshot.empty && normalized !== phoneNumber) {
      console.log('🔍 Trying normalized phone number...');
      q = query(
        collection(db, CUSTOMERS_COLLECTION),
        where('phoneNumber', '==', normalized),
        limit(1)
      );
      snapshot = await getDocs(q);
    }
    
    // If still not found, try with + prefix variations
    if (snapshot.empty) {
      const variations = [
        phoneNumber.startsWith('+') ? phoneNumber.slice(1) : '+' + phoneNumber,
        normalized.startsWith('+') ? normalized.slice(1) : '+' + normalized,
      ];
      
      for (const variant of variations) {
        if (variant !== phoneNumber && variant !== normalized) {
          console.log('🔍 Trying phone variant:', variant);
          q = query(
            collection(db, CUSTOMERS_COLLECTION),
            where('phoneNumber', '==', variant),
            limit(1)
          );
          snapshot = await getDocs(q);
          if (!snapshot.empty) break;
        }
      }
    }
    
    if (snapshot.empty) {
      console.log('❌ No customer found for phone:', phoneNumber);
      return null;
    }
    
    const doc = snapshot.docs[0];
    const customer = {
      id: doc.id,
      ...doc.data(),
      lastCallDate: doc.data().lastCallDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    } as Customer;
    
    console.log('✅ Customer found:', customer.id, customer.name);
    return customer;
  } catch (error) {
    console.error('❌ Error getting customer:', error);
    return null;
  }
}

/**
 * Create new customer
 */
export async function createCustomer(data: Partial<Customer>): Promise<Customer> {
  const customerId = `cust_${Date.now()}`;
  const customer: Customer = {
    id: customerId,
    phoneNumber: data.phoneNumber!,
    name: data.name,
    email: data.email,
    company: data.company,
    totalCalls: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: data.metadata || {},
  };

  // Filter out undefined values before saving to Firestore
  const customerData: any = {
    id: customerId,
    phoneNumber: customer.phoneNumber,
    totalCalls: 0,
    createdAt: Timestamp.fromDate(customer.createdAt),
    updatedAt: Timestamp.fromDate(customer.updatedAt),
    metadata: customer.metadata,
  };

  // Only add fields that are not undefined
  if (customer.name !== undefined && customer.name !== null) {
    customerData.name = customer.name;
  }
  if (customer.email !== undefined && customer.email !== null) {
    customerData.email = customer.email;
  }
  if (customer.company !== undefined && customer.company !== null) {
    customerData.company = customer.company;
  }

  await setDoc(doc(db, CUSTOMERS_COLLECTION, customerId), customerData);

  return customer;
}

/**
 * Update customer
 */
export async function updateCustomer(customerId: string, updates: Partial<Customer>): Promise<void> {
  // Filter out undefined values before updating Firestore
  const updateData: any = {
    updatedAt: Timestamp.now(),
  };

  // Only add fields that are not undefined
  Object.keys(updates).forEach((key) => {
    const value = updates[key as keyof Customer];
    if (value !== undefined && value !== null) {
      updateData[key] = value;
    }
  });

  await updateDoc(doc(db, CUSTOMERS_COLLECTION, customerId), updateData);
}

/**
 * Process call and save to database with AI analysis
 */
export async function processAndSaveCall(
  phoneNumber: string,
  retellCallId: string,
  transcript: string,
  duration: number
): Promise<{ customer: Customer; callRecord: CallRecord }> {
  try {
    console.log('📞 Processing call:', { phoneNumber, retellCallId, duration, transcriptLength: transcript.length });
    
    // Validate inputs
    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }
    if (!transcript || transcript.trim().length === 0) {
      throw new Error('Transcript is required');
    }
    if (!db) {
      throw new Error('Firebase database not initialized. Check your Firebase configuration.');
    }

    // Step 1: Analyze transcript with OpenAI
    console.log('🤖 Analyzing transcript with OpenAI...');
    let extractedData;
    try {
      extractedData = await analyzeTranscriptWithAI(transcript);
      console.log('✅ OpenAI analysis complete:', { 
        name: extractedData.customerName, 
        intent: extractedData.intent,
        sentiment: extractedData.sentiment,
        scheduledEvents: extractedData.scheduledEvents?.length || 0,
        importantDates: extractedData.importantDates?.length || 0,
        deadlines: extractedData.deadlines?.length || 0
      });
      
      // Log scheduled events if found
      if (extractedData.scheduledEvents && extractedData.scheduledEvents.length > 0) {
        console.log('📅 Scheduled events found:', extractedData.scheduledEvents.map(e => 
          `${e.type || 'event'} on ${e.date || 'TBD'} at ${e.time || 'TBD'}`
        ));
      }
    } catch (error: any) {
      console.error('⚠️ OpenAI analysis failed, using fallback:', error.message);
      // Use fallback data
      extractedData = {
        intent: 'general',
        sentiment: 'neutral',
        summary: transcript.substring(0, 200) + '...',
        keyPoints: [],
        actionItems: [],
        scheduledEvents: [],
        importantDates: [],
        deadlines: [],
        metadata: {},
      };
    }

    // Step 2: Get or create customer
    console.log('👤 Looking up customer:', phoneNumber);
    let customer = await getCustomerByPhone(phoneNumber);
    
    if (!customer) {
      console.log('👤 New customer detected, creating profile...');
      try {
        customer = await createCustomer({
          phoneNumber,
          name: extractedData.customerName,
          email: extractedData.email,
          company: extractedData.company,
        });
        console.log('✅ Customer created:', customer.id);
      } catch (error: any) {
        console.error('❌ Failed to create customer:', error);
        throw new Error(`Failed to create customer: ${error.message}`);
      }
    } else {
      console.log('👤 Existing customer found:', customer.id);
      // Update customer with new extracted data
      const updates: Partial<Customer> = {};
      if (extractedData.customerName && !customer.name) updates.name = extractedData.customerName;
      if (extractedData.email && !customer.email) updates.email = extractedData.email;
      if (extractedData.company && !customer.company) updates.company = extractedData.company;
      
      if (Object.keys(updates).length > 0) {
        try {
          await updateCustomer(customer.id, updates);
          customer = { ...customer, ...updates };
          console.log('✅ Customer updated');
        } catch (error: any) {
          console.error('⚠️ Failed to update customer:', error);
          // Continue anyway
        }
      }
    }

    // Step 3: Save call record
    const callId = `call_${Date.now()}`;
    const callRecord: CallRecord = {
      id: callId,
      customerId: customer.id,
      phoneNumber,
      retellCallId,
      date: new Date(),
      duration,
      transcript,
      extractedData,
      status: 'completed',
    };

    console.log('💾 Saving call record to Firebase...');
    try {
      await setDoc(doc(db, CALLS_COLLECTION, callId), {
        ...callRecord,
        date: Timestamp.fromDate(callRecord.date),
      });
      console.log('✅ Call record saved:', callId);
    } catch (error: any) {
      console.error('❌ Failed to save call record:', error);
      throw new Error(`Failed to save call record: ${error.message}`);
    }

    // Step 4: Save scheduled events if any
    if (extractedData.scheduledEvents && extractedData.scheduledEvents.length > 0) {
      console.log('📅 Saving scheduled events...');
      try {
        const eventPromises = extractedData.scheduledEvents.map(async (event, index) => {
          const eventId = `event_${Date.now()}_${index}`;
          await setDoc(doc(db, SCHEDULED_EVENTS_COLLECTION, eventId), {
            id: eventId,
            customerId: customer.id,
            phoneNumber,
            callId: callId,
            date: event.date || null,
            time: event.time || null,
            timezone: event.timezone || null,
            duration: event.duration || null,
            type: event.type || 'appointment',
            description: event.description || '',
            location: event.location || null,
            createdAt: Timestamp.now(),
            status: 'scheduled', // scheduled, completed, cancelled
          });
        });
        await Promise.all(eventPromises);
        console.log(`✅ Saved ${extractedData.scheduledEvents.length} scheduled event(s)`);
      } catch (error: any) {
        console.error('⚠️ Failed to save scheduled events:', error);
        // Continue anyway - call record is saved
      }
    }

    // Step 5: Update customer stats
    console.log('📊 Updating customer stats...');
    try {
      await updateDoc(doc(db, CUSTOMERS_COLLECTION, customer.id), {
        totalCalls: (customer.totalCalls || 0) + 1,
        lastCallDate: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      console.log('✅ Customer stats updated');
    } catch (error: any) {
      console.error('⚠️ Failed to update customer stats:', error);
      // Continue anyway - call record is saved
    }

    console.log('✅ Call processed and saved successfully!');
    
    return { customer, callRecord };
  } catch (error: any) {
    console.error('❌ Error processing call:', error);
    throw error;
  }
}

/**
 * Check if a call has already been processed (exists in database)
 */
export async function isCallProcessed(retellCallId: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, CALLS_COLLECTION),
      where('retellCallId', '==', retellCallId),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking if call is processed:', error);
    return false;
  }
}

/**
 * Get customer's call history
 */
export async function getCustomerCallHistory(customerId: string, limitCount = 10): Promise<CallRecord[]> {
  const q = query(
    collection(db, CALLS_COLLECTION),
    where('customerId', '==', customerId),
    orderBy('date', 'desc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    date: doc.data().date?.toDate(),
  } as CallRecord));
}

/**
 * Get comprehensive customer knowledge base for agent
 * This includes customer info, scheduled events, and call history
 */
export async function getCustomerKnowledgeBase(phoneNumber: string): Promise<{
  customer: Customer | null;
  scheduledEvents: any[];
  callHistory: CallRecord[];
  context: string | null;
}> {
  // Step 1: Check if customer exists - LOOKUP BY PHONE NUMBER ONLY (not name)
  console.log('🔍 Looking up customer by PHONE NUMBER:', phoneNumber);
  console.log('⚠️ IMPORTANT: Using phone number for lookup, NOT name');
  const customer = await getCustomerByPhone(phoneNumber);
  
  if (!customer) {
    console.log('ℹ️ No customer found in database for phone number:', phoneNumber);
    console.log('💡 This might be a new customer. Knowledge base will be empty.');
    return {
      customer: null,
      scheduledEvents: [],
      callHistory: [],
      context: null,
    };
  }
  
  console.log('✅ Customer found by PHONE NUMBER:', {
    phoneNumber: customer.phoneNumber,
    id: customer.id,
    name: customer.name || '(no name in database)',
    totalCalls: customer.totalCalls,
  });
  console.log('📋 Using customer data from phone number lookup (not name lookup)');

  // Step 2: Get scheduled events/appointments
  const scheduledEvents = await getCustomerScheduledEvents(customer.id);
  console.log('📅 Found scheduled events:', scheduledEvents.length, scheduledEvents);
  
  // Step 3: Get previous calls
  const callHistory = await getCustomerCallHistory(customer.id, 10);
  console.log('📞 Found call history:', callHistory.length);
  
  // Step 4: Generate comprehensive context
  let context: string | null = null;
  
  if (callHistory.length > 0 || scheduledEvents.length > 0) {
    console.log('🤖 Generating knowledge base context for customer...');
    
    // Build context string with all relevant information
    let contextParts: string[] = [];
    
    // Customer info
    contextParts.push(`CUSTOMER INFORMATION:`);
    if (customer.name) contextParts.push(`- Name: ${customer.name}`);
    if (customer.email) contextParts.push(`- Email: ${customer.email}`);
    if (customer.company) contextParts.push(`- Company: ${customer.company}`);
    contextParts.push(`- Phone: ${customer.phoneNumber}`);
    contextParts.push(`- Total Previous Calls: ${customer.totalCalls}`);
    
    // Scheduled Events/Appointments - Format in a way that's easy for AI to use
    if (scheduledEvents.length > 0) {
      contextParts.push(`\n=== UPCOMING APPOINTMENTS (USE THESE EXACT DETAILS) ===`);
      scheduledEvents.forEach((event, index) => {
        const appointmentDetails: string[] = [];
        
        if (event.description) {
          appointmentDetails.push(event.description);
        } else if (event.type) {
          appointmentDetails.push(event.type);
        } else {
          appointmentDetails.push('appointment');
        }
        
        if (event.date && event.time) {
          const dateStr = new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          appointmentDetails.push(`on ${dateStr} at ${event.time}`);
        } else if (event.date) {
          const dateStr = new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          appointmentDetails.push(`on ${dateStr}`);
        } else if (event.time) {
          appointmentDetails.push(`at ${event.time}`);
        }
        
        if (event.location) {
          appointmentDetails.push(`(${event.location})`);
        }
        
        contextParts.push(`APPOINTMENT ${index + 1}: ${appointmentDetails.join(' ')}`);
        
        // Also provide structured format
        if (event.date) {
          const dateStr = new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          });
          contextParts.push(`  - Full date: ${dateStr}`);
        }
        if (event.time) {
          contextParts.push(`  - Time: ${event.time}`);
        }
        if (event.description) {
          contextParts.push(`  - What: ${event.description}`);
        }
      });
      contextParts.push(`=== END OF APPOINTMENTS ===`);
    } else {
      contextParts.push(`\n=== UPCOMING APPOINTMENTS ===`);
      contextParts.push(`NONE - This customer has NO scheduled appointments in the database.`);
    }
    
    // Previous Call History
    if (callHistory.length > 0) {
      contextParts.push(`\nPREVIOUS CALL HISTORY:`);
      callHistory.slice(0, 5).forEach((call, index) => {
        const callDate = call.date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        contextParts.push(`${index + 1}. Call on ${callDate}`);
        contextParts.push(`   Intent: ${call.extractedData.intent}`);
        contextParts.push(`   Summary: ${call.extractedData.summary}`);
        
        // Include scheduled events from this call
        if (call.extractedData.scheduledEvents && call.extractedData.scheduledEvents.length > 0) {
          call.extractedData.scheduledEvents.forEach((event: any) => {
            if (event.date && event.time) {
              contextParts.push(`   - Scheduled: ${event.date} at ${event.time}`);
            }
          });
        }
        
        // Include action items
        if (call.extractedData.actionItems && call.extractedData.actionItems.length > 0) {
          contextParts.push(`   Action Items: ${call.extractedData.actionItems.join(', ')}`);
        }
      });
    }
    
    context = contextParts.join('\n');
  }

  return {
    customer,
    scheduledEvents,
    callHistory,
    context,
  };
}

/**
 * Get context for next call (THIS IS THE KEY FUNCTION!)
 * Enhanced to include scheduled events
 */
export async function getCustomerContextForNextCall(phoneNumber: string): Promise<string | null> {
  const knowledgeBase = await getCustomerKnowledgeBase(phoneNumber);
  
  if (!knowledgeBase.context) {
    return null;
  }

  // Generate AI-powered personalized context
  if (knowledgeBase.callHistory.length > 0) {
    console.log('🤖 Generating AI-powered context for repeat customer...');
    const aiContext = await generateCustomerContext({
      name: knowledgeBase.customer?.name,
      company: knowledgeBase.customer?.company,
      previousCalls: knowledgeBase.callHistory.map(call => ({
        date: call.date.toISOString(),
        summary: call.extractedData.summary,
        intent: call.extractedData.intent,
      })),
    });
    
    // Combine knowledge base with AI context
    return `${knowledgeBase.context}\n\nAI-GENERATED CONTEXT:\n${aiContext}`;
  }

  return knowledgeBase.context;
}

/**
 * Get all customers
 */
export async function getAllCustomers(limitCount = 100): Promise<Customer[]> {
  const q = query(
    collection(db, CUSTOMERS_COLLECTION),
    orderBy('updatedAt', 'desc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    lastCallDate: doc.data().lastCallDate?.toDate(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate(),
  } as Customer));
}

/**
 * Delete customer
 */
export async function deleteCustomer(customerId: string): Promise<void> {
  await deleteDoc(doc(db, CUSTOMERS_COLLECTION, customerId));
  
  // Also delete all related calls
  const q = query(collection(db, CALLS_COLLECTION), where('customerId', '==', customerId));
  const snapshot = await getDocs(q);
  
  const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
}

/**
 * Get scheduled events for a customer
 */
export async function getCustomerScheduledEvents(customerId: string): Promise<any[]> {
  const q = query(
    collection(db, SCHEDULED_EVENTS_COLLECTION),
    where('customerId', '==', customerId),
    where('status', '==', 'scheduled'),
    orderBy('date', 'asc')
  );

  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
  }));
}

/**
 * Get all upcoming scheduled events
 */
export async function getUpcomingScheduledEvents(limitCount = 50): Promise<any[]> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  const q = query(
    collection(db, SCHEDULED_EVENTS_COLLECTION),
    where('status', '==', 'scheduled'),
    orderBy('date', 'asc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  
  // Filter to only future events
  return snapshot.docs
    .map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        date: data.date || null,
      };
    })
    .filter((event: any) => {
      if (!event.date) return false;
      return event.date >= today;
    });
}

/**
 * Get all call records with transcripts
 */
export async function getAllCallRecords(limitCount = 1000): Promise<CallRecord[]> {
  const q = query(
    collection(db, CALLS_COLLECTION),
    orderBy('date', 'desc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    date: doc.data().date?.toDate(),
  } as CallRecord));
}

/**
 * Get question statistics from all call transcripts
 */
export async function getQuestionStatistics(questionsList: string[]): Promise<QuestionStats[]> {
  try {
    // Always filter by specific agent ID before calling Gemini
    const TARGET_AGENT_ID = "agent_8ab2d9490bf43cf83327ce1281";
    
    console.log(`📊 Fetching call records with transcripts for agent ${TARGET_AGENT_ID}...`);
    
    // Fetch calls from Retell API filtered by agent ID
    const allCalls = await retellApi.getAllCalls({ agent_id: TARGET_AGENT_ID });
    
    // Additional client-side filter to ensure only target agent calls are included
    const filteredCalls = allCalls.filter(call => call.agent_id === TARGET_AGENT_ID);
    
    // Filter calls with transcripts
    const callsWithTranscripts = filteredCalls.filter(
      call => call.transcript && call.transcript.trim().length > 0
    );
    
    console.log(`📝 Found ${callsWithTranscripts.length} calls with transcripts for agent ${TARGET_AGENT_ID}`);
    
    if (callsWithTranscripts.length === 0) {
      // Return empty array when no calls are available
      // Questions will only be shown if they appear in actual call logs
      return [];
    }
    
    // Prepare transcripts for analysis
    const transcripts = callsWithTranscripts.map(call => ({
      id: call.call_id,
      transcript: call.transcript,
    }));
    
    console.log(`🤖 Analyzing ${transcripts.length} transcripts in a single Gemini API call for agent ${TARGET_AGENT_ID}...`);
    const stats = await analyzeAllTranscriptsForQuestions(transcripts, questionsList);
    
    console.log('✅ Question statistics generated');
    return stats;
  } catch (error: any) {
    console.error('❌ Error getting question statistics:', error);
    throw error;
  }
}

