import { retell } from "./retellClient";

// Types for Retell AI API
export interface RetellCall {
  call_id: string;
  agent_id?: string;
  agent_name?: string;
  call_type?: "phone_call" | "web_call";
  from_number?: string;
  to_number?: string;
  direction?: "inbound" | "outbound";
  call_status?: "registered" | "ringing" | "ongoing" | "ended";
  start_timestamp?: number;
  end_timestamp?: number;
  duration_ms?: number;
  transcript?: string;
  transcript_object?: Array<{
    role: "agent" | "user";
    content: string;
    words?: Array<{
      word: string;
      start: number;
      end: number;
    }>;
  }>;
  recording_url?: string;
  recording_multi_channel_url?: string;
  scrubbed_recording_url?: string;
  scrubbed_recording_multi_channel_url?: string;
  metadata?: Record<string, any>;
  call_cost?: {
    total_cost?: number;
    product_costs?: Array<{
      product: string;
      cost: number;
    }>;
  };
  disconnection_reason?: string;
  call_analysis?: {
    call_summary?: string;
    user_sentiment?: string;
    call_successful?: boolean;
  };
}

export interface RetellAgent {
  agent_id: string;
  version?: number;
  is_published?: boolean;
  response_engine?: {
    type: string;
    llm_id?: string;
    version?: number;
  };
  agent_name: string | null;
  voice_id?: string;
  voice_model?: "eleven_turbo_v2" | "eleven_flash_v2" | "eleven_turbo_v2_5" | "eleven_flash_v2_5" | "eleven_multilingual_v2" | "tts-1" | "gpt-4o-mini-tts" | null;
  fallback_voice_ids?: string[] | null;
  voice_temperature?: number;
  voice_speed?: number;
  volume?: number;
  responsiveness?: number;
  interruption_sensitivity?: number;
  enable_backchannel?: boolean;
  backchannel_frequency?: number;
  backchannel_words?: string[] | null;
  reminder_trigger_ms?: number;
  reminder_max_count?: number;
  ambient_sound?: "coffee-shop" | "convention-hall" | "summer-outdoor" | "mountain-outdoor" | "static-noise" | "call-center" | null;
  ambient_sound_volume?: number;
  language?: string;
  webhook_url?: string | null;
  webhook_timeout_ms?: number;
  boosted_keywords?: string[] | null;
  data_storage_setting?: "everything" | "everything_except_pii" | "basic_attributes_only";
  opt_in_signed_url?: boolean;
  pronunciation_dictionary?: Array<{
    word: string;
    alphabet: string;
    phoneme: string;
  }> | null;
  normalize_for_speech?: boolean;
  end_call_after_silence_ms?: number;
  max_call_duration_ms?: number;
  voicemail_option?: {
    action: {
      type: string;
      text?: string;
    };
  } | null;
  post_call_analysis_data?: Array<{
    type: string;
    name: string;
    description: string;
    examples?: string[];
  }> | null;
  post_call_analysis_model?: string;
  begin_message_delay_ms?: number;
  ring_duration_ms?: number;
  stt_mode?: "fast" | "accurate";
  vocab_specialization?: "general" | "medical";
  allow_user_dtmf?: boolean;
  user_dtmf_options?: {
    digit_limit?: number;
    termination_key?: string;
    timeout_ms?: number;
  } | null;
  denoising_mode?: "noise-cancellation" | "noise-and-background-speech-cancellation";
  pii_config?: {
    mode?: string;
    categories?: string[];
  };
  last_modification_timestamp?: number;
  // Legacy fields for backward compatibility
  llm_websocket_url?: string;
  enable_transcription?: boolean;
  enable_recording?: boolean;
  metadata?: Record<string, any>;
  created_at?: number;
  updated_at?: number;
}

export interface RetellPhoneNumber {
  phone_number_id: string;
  phone_number: string;
  ncco?: any;
  inbound_agent_id?: string;
  created_at?: number;
  updated_at?: number;
}

export interface RetellKnowledgeBase {
  knowledge_base_id: string;
  knowledge_base_name?: string;
  knowledge_base_sources?: Array<{
    source_id: string;
    type: string;
    filename?: string;
    file_url?: string;
    file_size?: number;
    url?: string;
    created_at?: number;
  }>;
  created_at?: number;
  updated_at?: number;
}

export interface StartCallPayload {
  from_number: string; // Your Retell phone number (for outbound caller ID)
  to_number: string; // Recipient's phone number in E.164 format
  agent_id: string;
  metadata?: Record<string, any>;
  retell_llm_dynamic_variables?: Record<string, string>;
}

// ============================
// CALLS API
// ============================

/**
 * Start a new outbound call
 */
export const startCall = async (payload: StartCallPayload): Promise<RetellCall> => {
  const response = await retell.post("/v2/create-phone-call", payload);
  return response.data;
};

/**
 * Get all calls with optional filters
 */
export const getAllCalls = async (params?: {
  agent_id?: string;
  limit?: number;
  offset?: number;
}): Promise<RetellCall[]> => {
  const requestBody: any = {};
  
  if (params?.agent_id) {
    requestBody.filter_criteria = {
      agent_id: [params.agent_id],
    };
  }
  
  if (params?.limit) {
    requestBody.limit = params.limit;
  }
  
  const response = await retell.post("/v2/list-calls", requestBody);
  // Retell AI returns an array directly, not wrapped in a 'calls' property
  return Array.isArray(response.data) ? response.data : [];
};

/**
 * Get active calls
 */
export const getActiveCalls = async (): Promise<RetellCall[]> => {
  // Always filter by specific agent ID
  const TARGET_AGENT_ID = "agent_8ab2d9490bf43cf83327ce1281";
  const response = await retell.post("/v2/list-calls", {
    filter_criteria: {
      call_status: ["ongoing"],
      agent_id: [TARGET_AGENT_ID],
    },
  });
  // Retell AI returns an array directly, not wrapped in a 'calls' property
  // Additional client-side filter to ensure only target agent calls are included
  const calls = Array.isArray(response.data) ? response.data : [];
  return calls.filter(call => call.agent_id === TARGET_AGENT_ID);
};

/**
 * Get completed calls
 */
export const getCompletedCalls = async (limit: number = 50): Promise<RetellCall[]> => {
  // Always filter by specific agent ID
  const TARGET_AGENT_ID = "agent_8ab2d9490bf43cf83327ce1281";
  const response = await retell.post("/v2/list-calls", {
    filter_criteria: {
      call_status: ["ended"],
      agent_id: [TARGET_AGENT_ID],
    },
    limit,
  });
  // Retell AI returns an array directly, not wrapped in a 'calls' property
  // Additional client-side filter to ensure only target agent calls are included
  const calls = Array.isArray(response.data) ? response.data : [];
  return calls.filter(call => call.agent_id === TARGET_AGENT_ID);
};

/**
 * Get a specific call by ID
 */
export const getCallById = async (callId: string): Promise<RetellCall> => {
  const response = await retell.get("/v2/get-call", {
    params: { call_id: callId },
  });
  return response.data;
};

/**
 * Get call recording URL
 * Returns the best available recording URL (prefers regular recording over scrubbed)
 */
export const getCallRecordingUrl = async (callId: string): Promise<string | null> => {
  try {
    const call = await getCallById(callId);
    // Retell AI provides multiple recording URLs - prefer regular recording
    return call.recording_url || call.recording_multi_channel_url || call.scrubbed_recording_url || call.scrubbed_recording_multi_channel_url || null;
  } catch (error) {
    console.error("Error fetching call recording:", error);
    return null;
  }
};

/**
 * End an active call
 */
export const endCall = async (callId: string): Promise<void> => {
  await retell.patch("/v2/update-call", {
    call_id: callId,
    end_call: true,
  });
};

// ============================
// AGENTS API
// ============================

/**
 * Get all agents
 */
export const getAllAgents = async (): Promise<RetellAgent[]> => {
  const response = await retell.get("/list-agents");
  // Retell AI returns an array directly, not wrapped in an 'agents' property
  return Array.isArray(response.data) ? response.data : [];
};

/**
 * Get a specific agent by ID
 */
export const getAgentById = async (agentId: string): Promise<RetellAgent> => {
  const response = await retell.get(`/get-agent/${agentId}`);
  return response.data;
};

/**
 * Create a new agent
 */
export const createAgent = async (payload: Partial<RetellAgent>): Promise<RetellAgent> => {
  const response = await retell.post("/create-agent", payload);
  return response.data;
};

/**
 * Update an existing agent
 */
export const updateAgent = async (
  agentId: string,
  payload: Partial<RetellAgent>
): Promise<RetellAgent> => {
  const response = await retell.patch(`/update-agent/${agentId}`, payload);
  return response.data;
};

/**
 * Delete an agent
 */
export const deleteAgent = async (agentId: string): Promise<void> => {
  await retell.delete("/delete-agent", {
    params: { agent_id: agentId },
  });
};

// ============================
// PHONE NUMBERS API
// ============================

/**
 * Get all phone numbers
 */
export const getAllPhoneNumbers = async (): Promise<RetellPhoneNumber[]> => {
  const response = await retell.get("/list-phone-numbers");
  return response.data?.phone_numbers || response.data || [];
};

/**
 * Get a specific phone number by ID
 */
export const getPhoneNumberById = async (phoneNumberId: string): Promise<RetellPhoneNumber> => {
  const response = await retell.get("/get-phone-number", {
    params: { phone_number_id: phoneNumberId },
  });
  return response.data;
};

// ============================
// KNOWLEDGE BASE API
// ============================

/**
 * Get a specific knowledge base by ID
 */
export const getKnowledgeBase = async (knowledgeBaseId: string): Promise<RetellKnowledgeBase> => {
  const response = await retell.get(`/get-knowledge-base/${knowledgeBaseId}`);
  return response.data;
};

// ============================
// ANALYTICS & METRICS
// ============================

/**
 * Get call analytics/metrics
 */
export const getCallAnalytics = async (params?: {
  startDate?: string;
  endDate?: string;
  agentId?: string;
}): Promise<any> => {
  const calls = await getAllCalls({ agent_id: params?.agentId });
  
  // Calculate metrics from calls
  const totalCalls = calls.length;
  const completedCalls = calls.filter((call) => call.call_status === "ended");
  const avgDuration =
    completedCalls.length > 0
      ? completedCalls.reduce((sum, call) => sum + (call.duration_ms || 0), 0) / completedCalls.length
      : 0;
  
  const totalCost = calls.reduce((sum, call) => sum + (call.call_cost?.total_cost || 0), 0);

  return {
    totalCalls,
    completedCalls: completedCalls.length,
    avgDuration: Math.round(avgDuration),
    totalCost: totalCost.toFixed(2),
  };
};

export default {
  // Calls
  startCall,
  getAllCalls,
  getActiveCalls,
  getCompletedCalls,
  getCallById,
  getCallRecordingUrl,
  endCall,
  // Agents
  getAllAgents,
  getAgentById,
  createAgent,
  updateAgent,
  deleteAgent,
  // Phone Numbers
  getAllPhoneNumbers,
  getPhoneNumberById,
  // Knowledge Base
  getKnowledgeBase,
  // Analytics
  getCallAnalytics,
};

