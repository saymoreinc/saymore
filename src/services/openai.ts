import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true, // Note: For production, use a backend API
  maxRetries: 0, // Disable automatic retries - we want only one API call
});

// Initialize Gemini AI for FAQ analysis (better rate limits than OpenAI free tier)
// Get your API key from: https://makersuite.google.com/app/apikey
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

export interface ScheduledEvent {
  date?: string; // ISO date string
  time?: string; // Time in format "HH:MM" or "HH:MM AM/PM"
  timezone?: string;
  duration?: number; // Duration in minutes
  type?: string; // "call", "meeting", "appointment", "follow-up", etc.
  description?: string;
  location?: string; // For in-person meetings
}

export interface ExtractedCallData {
  customerName?: string;
  email?: string;
  phone?: string;
  company?: string;
  intent: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  nextSteps?: string;
  scheduledEvents?: ScheduledEvent[]; // Extracted schedules/appointments
  importantDates?: string[]; // Any important dates mentioned
  deadlines?: string[]; // Any deadlines mentioned
  metadata: Record<string, any>;
}

/**
 * Use OpenAI to analyze call transcript and extract structured data
 */
export async function analyzeTranscriptWithAI(transcript: string): Promise<ExtractedCallData> {
  const prompt = `Analyze this customer service call transcript and extract key information, especially scheduling and appointment details:

TRANSCRIPT:
"""
${transcript}
"""

Extract and return the following information in JSON format:
{
  "customerName": "extracted name if mentioned, otherwise null",
  "email": "extracted email if mentioned, otherwise null",
  "phone": "extracted phone number if mentioned, otherwise null",
  "company": "company name if mentioned, otherwise null",
  "intent": "primary reason for call (support/sales/inquiry/appointment/complaint/scheduling/follow-up/other)",
  "sentiment": "overall sentiment (positive/neutral/negative)",
  "summary": "Write a brief 2-3 sentence summary of what happened in the call. DO NOT copy the transcript. Summarize the key points only.",
  "keyPoints": ["important point 1", "important point 2", ...],
  "actionItems": ["action item 1", "action item 2", ...],
  "nextSteps": "what should happen next",
  "scheduledEvents": [
    {
      "date": "YYYY-MM-DD format if date mentioned (e.g., 'November 8, 2024' becomes '2024-11-08'), otherwise null",
      "time": "Time in format mentioned (e.g., '10:30 AM' or '10:30'), otherwise null",
      "timezone": "timezone if mentioned, otherwise null",
      "duration": "duration in minutes if mentioned, otherwise null",
      "type": "appointment/meeting/call/follow-up/other",
      "description": "what the scheduled event is about (e.g., 'General health check with Dr. Patel')",
      "location": "location if mentioned (phone/video/in-person address), otherwise null"
    }
  ],
  "importantDates": ["date 1 mentioned", "date 2 mentioned", ...],
  "deadlines": ["deadline 1", "deadline 2", ...],
  "metadata": {
    "productsMentioned": ["product1", "product2"],
    "issuesRaised": ["issue1", "issue2"],
    "questionsAsked": ["question1", "question2"],
    "pricingMentioned": ["price 1", "price 2"],
    "promisesMade": ["promise 1", "promise 2"],
    "doctorName": "doctor or provider name if mentioned",
    "appointmentType": "type of appointment if mentioned (e.g., 'general health check', 'primary care visit')"
  }
}

IMPORTANT: 
- Pay special attention to scheduling information: dates, times, appointments, follow-ups, callbacks, meeting times
- Extract dates in YYYY-MM-DD format when possible (e.g., "November 8, 2024" → "2024-11-08")
- Extract times in HH:MM format (24-hour) or preserve as mentioned (e.g., "10:30 AM" → "10:30" or "10:30 AM")
- For meeting/appointment times, extract:
  * Exact date and time mentioned
  * Timezone if mentioned (e.g., "PST", "EST", "UTC")
  * Duration if mentioned (in minutes)
  * Location (phone call, video call, in-person address)
  * Doctor/provider name if mentioned
  * Type of appointment/meeting
- Include scheduledEvents array even if empty
- Extract any deadlines or important dates mentioned
- If multiple time options are mentioned, create separate events for each
- CRITICAL INSTRUCTIONS:
- The "summary" field must be a brief 2-3 sentence summary, NOT the full transcript
- For scheduledEvents, extract ALL appointment/meeting times mentioned, even if multiple options are given
- If the user mentions multiple time options (e.g., "Wednesday at 10:30 AM or Thursday at 2 PM"), create separate events for EACH option
- Extract dates in YYYY-MM-DD format (e.g., "November 8, 2024" → "2024-11-08")
- Extract times preserving the format mentioned (e.g., "10:30 AM" or "10:30")
- Be concise and accurate. Extract only what's explicitly mentioned.`;

  // Try multiple models in order of preference
  const models = ['gpt-4o-mini', 'gpt-3.5-turbo', 'gpt-4'];
  
  for (const model of models) {
    try {
      console.log(`🤖 Trying OpenAI model: ${model}`);
      const response = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing customer service call transcripts and extracting structured data. Always return valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error('No response from OpenAI');

      const extracted: ExtractedCallData = JSON.parse(content);
      console.log(`✅ Successfully extracted data using ${model}`);
      return extracted;
    } catch (error: any) {
      console.warn(`⚠️ Model ${model} failed:`, error.message);
      
      // If this is the last model, use fallback
      if (model === models[models.length - 1]) {
        console.error('❌ All OpenAI models failed, using fallback extraction');
        // Fallback to basic extraction
        return {
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
      // Otherwise, try the next model
      continue;
    }
  }
  
  // This should never be reached, but just in case
  return {
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

/**
 * Generate context summary for repeat customer
 */
export async function generateCustomerContext(
  customerHistory: {
    name?: string;
    company?: string;
    previousCalls: Array<{
      date: string;
      summary: string;
      intent: string;
    }>;
  }
): Promise<string> {
  const prompt = `Generate a brief context summary for an AI assistant about this repeat customer:

Customer: ${customerHistory.name || 'Unknown'}
Company: ${customerHistory.company || 'Unknown'}

Previous Call History:
${customerHistory.previousCalls.map((call, idx) => `
Call ${idx + 1} (${new Date(call.date).toLocaleDateString()}):
- Intent: ${call.intent}
- Summary: ${call.summary}
`).join('\n')}

Generate a concise 2-3 sentence context that the AI assistant should know when greeting this customer. Focus on:
1. What they needed before
2. Any outstanding issues or promises
3. How to personalize the greeting

Keep it conversational and actionable.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are helping an AI assistant prepare for a customer call by providing relevant context from previous interactions.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    return response.choices[0].message.content || 'This customer has called before.';
  } catch (error) {
    console.error('Error generating context:', error);
    return `This is ${customerHistory.name || 'a repeat customer'}. They've called ${customerHistory.previousCalls.length} time(s) before.`;
  }
}

/**
 * Analyze transcript to identify which questions from a provided list are asked
 */
/**
 * Retry helper with exponential backoff for rate limit errors
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5,
  baseDelay: number = 2000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      // Check for rate limit errors from OpenAI SDK
      const isRateLimit = 
        error?.status === 429 || 
        error?.response?.status === 429 ||
        error?.statusCode === 429 ||
        (error?.message && error.message.includes('429')) ||
        (error?.error?.code === 'rate_limit_exceeded');
      
      if (isRateLimit && attempt < maxRetries - 1) {
        // Exponential backoff with longer delays: 2s, 4s, 8s, 16s, 32s
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`⚠️ Rate limit hit (429), waiting ${delay/1000}s before retry ${attempt + 1}/${maxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If it's not a rate limit error or we've exhausted retries, throw
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

export async function analyzeQuestionsFromTranscript(
  transcript: string,
  questionsList: string[]
): Promise<string[]> {
  const questionsJson = JSON.stringify(questionsList, null, 2);
  
  const prompt = `Analyze this customer service call transcript and identify which questions from the provided list are asked or mentioned.

TRANSCRIPT:
"""
${transcript}
"""

QUESTIONS LIST:
${questionsJson}

Your task:
1. Carefully read the transcript and identify which questions from the list are asked, mentioned, or discussed
2. Match questions even if they're paraphrased, asked in different wording, or use synonyms
3. Be flexible - match the intent even if the exact wording differs slightly
4. For example, "How can I reset my password?" should match "How do I reset my password?"
5. Return ONLY the exact questions from the provided list that match (use the exact text from the list)
6. If a question is asked multiple times in the transcript, still return it only once
7. Return an empty array if no questions match

IMPORTANT: Be thorough and match questions based on meaning, not just exact wording. Look for:
- Password reset questions
- Login/authentication questions  
- Email verification questions
- Account management questions
- Security questions
- Any other questions from the list

Return a JSON object with this format:
{
  "questions": ["exact question 1 from the list", "exact question 2 from the list", ...]
}

If no questions match, return: {"questions": []}`;

  try {
    const response = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
        model: 'gpt-4.1-mini"',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at analyzing customer service transcripts and identifying specific questions. Always return valid JSON array of strings.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      });
    });

    const content = response.choices[0].message.content;
    if (!content) return [];

    const result = JSON.parse(content);
    
    // Handle different response formats
    if (Array.isArray(result)) {
      return result;
    } else if (result.questions && Array.isArray(result.questions)) {
      return result.questions;
    } else if (result.matchedQuestions && Array.isArray(result.matchedQuestions)) {
      return result.matchedQuestions;
    }
    
    return [];
  } catch (error: any) {
    // Check if it's a rate limit error
    const isRateLimit = 
      error?.status === 429 || 
      error?.response?.status === 429 ||
      error?.statusCode === 429 ||
      (error?.message && error.message.includes('429')) ||
      (error?.error?.code === 'rate_limit_exceeded');
    
    if (isRateLimit) {
      console.error('⚠️ Rate limit error in analyzeQuestionsFromTranscript. Retry logic should handle this.');
    } else {
      console.error('Error analyzing questions from transcript:', error?.message || error);
    }
    // Return empty array on error to continue processing other transcripts
    return [];
  }
}

/**
 * Analyze multiple transcripts and aggregate question statistics
 */
export interface QuestionStats {
  question: string;
  count: number;
  percentage: number;
}

// Global flag to prevent multiple simultaneous calls
let isAnalyzing = false;
let lastCallTime = 0;
const MIN_TIME_BETWEEN_CALLS = 2000; // 2 seconds minimum between calls

export async function analyzeAllTranscriptsForQuestions(
  transcripts: Array<{ id: string; transcript: string }>,
  questionsList: string[]
): Promise<QuestionStats[]> {
  // Prevent multiple simultaneous calls
  if (isAnalyzing) {
    console.log('⚠️ Analysis already in progress, skipping duplicate call');
    throw new Error('Analysis already in progress. Please wait for the current analysis to complete.');
  }

  // Check if we're calling too soon after the last call (rate limit protection)
  const now = Date.now();
  const timeSinceLastCall = now - lastCallTime;
  if (timeSinceLastCall < MIN_TIME_BETWEEN_CALLS) {
    const waitTime = MIN_TIME_BETWEEN_CALLS - timeSinceLastCall;
    console.log(`⏳ Waiting ${waitTime}ms before making API call to avoid rate limits...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  isAnalyzing = true;
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  lastCallTime = Date.now();
  
  try {
    console.log(`🆔 Request ID: ${requestId} - Starting analysis`);
  const questionCounts: Record<string, number> = {};
  
  // Initialize counts
  questionsList.forEach(question => {
    questionCounts[question] = 0;
  });

    // Filter out empty transcripts
    const validTranscripts = transcripts.filter(
      item => item.transcript && item.transcript.trim().length > 0
    );

    if (validTranscripts.length === 0) {
      console.log('⚠️ No valid transcripts to analyze');
      return questionsList.map(question => ({
        question,
        count: 0,
        percentage: 0,
      }));
    }

    console.log(`📊 Preparing to analyze ${validTranscripts.length} transcripts in a SINGLE API call...`);

    // Combine all transcripts into one prompt
    const transcriptsText = validTranscripts.map((item, index) => {
      return `--- TRANSCRIPT ${index + 1} (ID: ${item.id}) ---\n${item.transcript}\n`;
    }).join('\n\n');

    const questionsJson = JSON.stringify(questionsList, null, 2);
    
    const prompt = `Analyze ALL the customer service call transcripts below and identify which questions from the provided list are asked or mentioned in EACH transcript.

TRANSCRIPTS:
"""
${transcriptsText}
"""

QUESTIONS LIST:
${questionsJson}

Your task:
1. For EACH transcript, identify which questions from the list are asked, mentioned, or discussed
2. Match questions even if they're paraphrased, asked in different wording, or use synonyms
3. Be flexible - match the intent even if the exact wording differs slightly
4. Return ONLY the exact questions from the provided list that match (use the exact text from the list)
5. If a question is asked multiple times in a transcript, still count it only once per transcript
6. Return an empty array for a transcript if no questions match

IMPORTANT: Be thorough and match questions based on meaning, not just exact wording.

Return a JSON object with this format:
{
  "results": [
    {
      "transcript_id": "call_123",
      "questions": ["exact question 1 from the list", "exact question 2 from the list", ...]
    },
    {
      "transcript_id": "call_456",
      "questions": ["exact question 1 from the list", ...]
    },
    ...
  ]
}

If no questions match for a transcript, include it with an empty questions array:
{
  "transcript_id": "call_789",
  "questions": []
}`;

    console.log(`🤖 [${requestId}] Making ONE API call to Gemini with all transcripts (waiting for response)...`);
    console.log(`📝 [${requestId}] Total prompt length: ${prompt.length} characters`);
    console.log(`📝 [${requestId}] Number of transcripts: ${validTranscripts.length}`);
    
    // Make a single API call to Gemini - better rate limits than OpenAI free tier
    const apiCallStartTime = Date.now();
    console.log(`⏰ [${requestId}] API call started at ${new Date().toISOString()}`);
    
    // Use Gemini 2.5 Flash (or try other models if this doesn't work)
    // Try different model names in order
    const modelNames = ['gemini-2.5-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-flash', 'gemini-pro'];
    let geminiResponse;
    let usedModel = '';
    let lastError: any = null;
    
    for (const modelName of modelNames) {
      try {
        console.log(`🔄 [${requestId}] Trying Gemini model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        
        // Combine system and user prompts for Gemini
        const fullPrompt = `You are an expert at analyzing customer service transcripts and identifying specific questions. Always return valid JSON with the exact format requested.

${prompt}`;
        
        const geminiResult = await model.generateContent(fullPrompt);
        geminiResponse = await geminiResult.response;
        usedModel = modelName;
        console.log(`✅ [${requestId}] Successfully using model: ${modelName}`);
        break; // Success, exit loop
      } catch (error: any) {
        console.log(`⚠️ [${requestId}] Model ${modelName} failed:`, error?.message || error);
        lastError = error;
        // Continue to next model
      }
    }
    
    if (!geminiResponse) {
      console.error(`❌ [${requestId}] All Gemini models failed. Last error:`, lastError);
      throw lastError || new Error('All Gemini models failed. Please check your API key and model availability.');
    }
    
    const apiCallEndTime = Date.now();
    const apiCallDuration = apiCallEndTime - apiCallStartTime;
    console.log(`✅ [${requestId}] API call completed in ${apiCallDuration}ms`);

    const content = geminiResponse.text();
    if (!content) {
      throw new Error('No response content from Gemini');
    }

    // Parse JSON from Gemini response (it may include markdown code blocks)
    let jsonContent = content.trim();
    // Remove markdown code blocks if present
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/```\n?/g, '');
    }
    
    const parsedResult = JSON.parse(jsonContent);
    
    // Process results and aggregate question counts
    if (parsedResult.results && Array.isArray(parsedResult.results)) {
      parsedResult.results.forEach((transcriptResult: any) => {
        if (transcriptResult.questions && Array.isArray(transcriptResult.questions)) {
          transcriptResult.questions.forEach((question: string) => {
        if (questionCounts.hasOwnProperty(question)) {
          questionCounts[question]++;
        }
      });
        }
      });
    } else {
      console.warn('⚠️ Unexpected response format from Gemini:', parsedResult);
    }

    const totalCalls = validTranscripts.length;
  
  // Convert to array and calculate percentages
  const stats: QuestionStats[] = questionsList
    .map(question => ({
      question,
      count: questionCounts[question] || 0,
      percentage: totalCalls > 0 ? (questionCounts[question] || 0) / totalCalls * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count); // Sort by count descending

    console.log(`✅ [${requestId}] Completed analysis of ${validTranscripts.length} transcripts in a single API call`);
  return stats;
  } catch (error: any) {
    const isRateLimit = 
      error?.status === 429 || 
      error?.response?.status === 429 ||
      error?.statusCode === 429 ||
      (error?.message && error.message.includes('429')) ||
      (error?.message && error.message.includes('quota')) ||
      (error?.message && error.message.includes('rate limit'));
    
    if (isRateLimit) {
      console.error(`❌ [${requestId}] Rate limit error. This means:`);
      console.error(`   - Your Gemini API account has hit its rate limit`);
      console.error(`   - Please wait 60 seconds before trying again`);
      console.error(`   - Check your API key and quota at: https://makersuite.google.com/app/apikey`);
      
      // Extract retry-after header if available
      const retryAfter = error?.response?.headers?.['retry-after'] || 
                        error?.headers?.['retry-after'] || 
                        '60';
      
      throw new Error(`Rate limit exceeded. Please wait ${retryAfter} seconds and try again. Check your Gemini API key and quota.`);
    } else {
      console.error(`❌ [${requestId}] Error analyzing transcripts:`, error?.message || error);
      
      // Check if it's an API key error
      if (error?.message?.includes('API_KEY') || error?.message?.includes('api key')) {
        throw new Error('Invalid or missing Gemini API key. Please set your API key in the code. Get one at: https://makersuite.google.com/app/apikey');
      }
      
      throw error;
    }
  } finally {
    // Always reset the flag
    isAnalyzing = false;
    console.log(`🏁 [${requestId}] Analysis process completed, flag reset`);
  }
}

