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
  agent_name: string;
  llm_websocket_url?: string;
  voice_id?: string;
  language?: string;
  responsiveness?: number;
  interruption_sensitivity?: number;
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
  const response = await retell.post("/v2/list-calls", {
    filter_criteria: {
      call_status: ["ongoing"],
    },
  });
  // Retell AI returns an array directly, not wrapped in a 'calls' property
  return Array.isArray(response.data) ? response.data : [];
};

/**
 * Get completed calls
 */
export const getCompletedCalls = async (limit: number = 50): Promise<RetellCall[]> => {
  const response = await retell.post("/v2/list-calls", {
    filter_criteria: {
      call_status: ["ended"],
    },
    limit,
  });
  // Retell AI returns an array directly, not wrapped in a 'calls' property
  return Array.isArray(response.data) ? response.data : [];
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
  const response = await retell.get("/get-agent", {
    params: { agent_id: agentId },
  });
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
  const response = await retell.patch("/update-agent", {
    agent_id: agentId,
    ...payload,
  });
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
  // Analytics
  getCallAnalytics,
};

