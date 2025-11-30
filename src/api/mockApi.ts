// API functions using Retell AI
import { mockUser, mockUsers, mockOrganizations, mockApiKeys, mockChartData } from "./mockData";
import * as retellApi from "./retellApi";

// Simulate API delay for non-Retell endpoints
const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

export const authApi = {
  login: async (email: string, password: string) => {
    await delay();
    // Mock validation
    if (email && password) {
      const token = "mock_jwt_token_" + Date.now();
      localStorage.setItem("authToken", token);
      localStorage.setItem("user", JSON.stringify(mockUser));
      return { success: true, user: mockUser, token };
    }
    throw new Error("Invalid credentials");
  },

  logout: async () => {
    await delay(100);
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    return { success: true };
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem("authToken");
  },
};

export const dashboardApi = {
  getKPIs: async () => {
    try {
      const calls = await retellApi.getAllCalls();
      const completedCalls = calls.filter(call => call.call_status === "ended");
      
      const totalCalls = calls.length;
      const avgDuration = completedCalls.length > 0
        ? Math.round(completedCalls.reduce((sum, call) => sum + (call.duration_ms || 0) / 1000, 0) / completedCalls.length)
        : 0;
      
      // AI response time not directly available, using estimated value
      const avgResponseTime = 1.2;
      
      const convertedCalls = calls.filter(call => call.metadata?.converted === true).length;
      const conversionRate = totalCalls > 0
        ? parseFloat(((convertedCalls / totalCalls) * 100).toFixed(1))
        : 0;

    return {
      totalCalls,
      avgDuration,
        avgResponseTime,
        conversionRate,
      };
    } catch (error) {
      console.error("Error fetching KPIs:", error);
      return {
        totalCalls: 0,
        avgDuration: 0,
        avgResponseTime: 0,
        conversionRate: 0,
    };
    }
  },

  getChartData: async () => {
    try {
      const calls = await retellApi.getAllCalls();
      
      // Group calls by date for the last 30 days
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return date.toISOString().split('T')[0];
      });
      
      const chartData = last30Days.map(date => {
        const dateCalls = calls.filter(call => 
          call.start_timestamp && new Date(call.start_timestamp).toISOString().startsWith(date)
        );
        const conversions = dateCalls.filter(call => call.metadata?.converted === true).length;
        
        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          calls: dateCalls.length,
          conversions,
        };
      });
      
      return chartData;
    } catch (error) {
      console.error("Error fetching chart data:", error);
      return [];
    }
  },

  getLiveCalls: async () => {
    try {
      const calls = await retellApi.getAllCalls({ limit: 5 });
      return calls.slice(0, 5).map(call => ({
        id: call.call_id,
        assistantId: call.agent_id || "",
        assistantName: call.agent_name || (call.agent_id ? `Assistant ${call.agent_id.slice(-4)}` : "Assistant"),
        phoneNumber: call.to_number || call.from_number || "N/A",
        duration: call.duration_ms ? Math.round(call.duration_ms / 1000) : 0,
        aiResponseTime: 0,
        status: call.call_status === "ended" ? "completed" : call.call_status === "ongoing" ? "active" : "failed",
        timestamp: call.start_timestamp ? new Date(call.start_timestamp).toISOString() : new Date().toISOString(),
        transcript: call.transcript || "",
        converted: call.metadata?.converted || false,
      }));
    } catch (error) {
      console.error("Error fetching live calls:", error);
      return [];
    }
  },
};

export const callsApi = {
  getAllCalls: async (filters?: { startDate?: string; endDate?: string; assistant?: string; status?: string }) => {
    try {
      const calls = await retellApi.getAllCalls({
        agent_id: filters?.assistant !== "all" ? filters?.assistant : undefined,
      });
      
      // Filter by status if needed
      let filteredCalls = calls;
      if (filters?.status && filters.status !== "all") {
        const statusMap: Record<string, string> = {
          "completed": "ended",
          "active": "ongoing",
          "failed": "ended",
        };
        const retellStatus = statusMap[filters.status] || filters.status;
        filteredCalls = calls.filter(call => call.call_status === retellStatus);
      }
      
      // Transform Retell calls to match expected structure
      return filteredCalls.map(call => ({
        id: call.call_id,
        assistantId: call.agent_id || "",
        assistantName: call.agent_name || (call.agent_id ? `Assistant ${call.agent_id.slice(-4)}` : "Assistant"),
        phoneNumber: call.to_number || call.from_number || "N/A",
        duration: call.duration_ms ? Math.round(call.duration_ms / 1000) : 0,
        aiResponseTime: 0, // Not directly available in Retell API
        status: call.call_status === "ended" ? "completed" : call.call_status === "ongoing" ? "active" : "failed",
        timestamp: call.start_timestamp ? new Date(call.start_timestamp).toISOString() : new Date().toISOString(),
        transcript: call.transcript || "No transcript available",
        recordingUrl: call.recording_url || call.recording_multi_channel_url || call.scrubbed_recording_url || call.scrubbed_recording_multi_channel_url || null,
        converted: call.metadata?.converted || false,
      }));
    } catch (error) {
      console.error("Error fetching Retell calls:", error);
      throw error;
    }
  },

  getCallById: async (id: string) => {
    try {
      const call = await retellApi.getCallById(id);
      return {
        id: call.call_id,
        assistantId: call.agent_id || "",
        assistantName: call.agent_name || (call.agent_id ? `Assistant ${call.agent_id.slice(-4)}` : "Assistant"),
        phoneNumber: call.to_number || call.from_number || "N/A",
        duration: call.duration_ms ? Math.round(call.duration_ms / 1000) : 0,
        aiResponseTime: 0,
        status: call.call_status === "ended" ? "completed" : call.call_status === "ongoing" ? "active" : "failed",
        timestamp: call.start_timestamp ? new Date(call.start_timestamp).toISOString() : new Date().toISOString(),
        transcript: call.transcript || "No transcript available",
        converted: call.metadata?.converted || false,
      };
    } catch (error) {
      console.error("Error fetching Retell call:", error);
      throw error;
    }
  },

  searchCalls: async (query: string) => {
    try {
      const calls = await retellApi.getAllCalls();
    const lowerQuery = query.toLowerCase();
      return calls
        .filter(call => 
          call.to_number?.toLowerCase().includes(lowerQuery) ||
          call.from_number?.toLowerCase().includes(lowerQuery) ||
          call.transcript?.toLowerCase().includes(lowerQuery) ||
          call.call_id.toLowerCase().includes(lowerQuery)
        )
        .map(call => ({
          id: call.call_id,
          assistantId: call.agent_id || "",
          assistantName: call.agent_name || (call.agent_id ? `Assistant ${call.agent_id.slice(-4)}` : "Assistant"),
          phoneNumber: call.to_number || call.from_number || "N/A",
          duration: call.duration_ms ? Math.round(call.duration_ms / 1000) : 0,
          aiResponseTime: 0,
          status: call.call_status === "ended" ? "completed" : call.call_status === "ongoing" ? "active" : "failed",
          timestamp: call.start_timestamp ? new Date(call.start_timestamp).toISOString() : new Date().toISOString(),
          transcript: call.transcript || "No transcript available",
          converted: call.metadata?.converted || false,
        }));
    } catch (error) {
      console.error("Error searching Retell calls:", error);
      throw error;
    }
  },

  startCall: async (payload: { assistantId: string; customerNumber: string; phoneNumberId?: string; metadata?: any }) => {
    try {
      // Note: Retell requires from_number (your phone number) and to_number (customer number)
      // The phoneNumberId should be used to get the actual phone number
      if (!payload.phoneNumberId) {
        throw new Error("phoneNumberId is required for Retell AI calls");
      }
      const phoneNumber = await retellApi.getPhoneNumberById(payload.phoneNumberId);
      return await retellApi.startCall({
        agent_id: payload.assistantId,
        from_number: phoneNumber.phone_number,
        to_number: payload.customerNumber,
        metadata: payload.metadata,
      });
    } catch (error) {
      console.error("Error starting Retell call:", error);
      throw error;
    }
  },

  getActiveCalls: async () => {
    try {
      const calls = await retellApi.getActiveCalls();
      return calls.map(call => ({
        id: call.call_id,
        assistantId: call.agent_id || "",
        assistantName: call.agent_name || (call.agent_id ? `Assistant ${call.agent_id.slice(-4)}` : "Assistant"),
        phoneNumber: call.to_number || call.from_number || "N/A",
        duration: call.duration_ms ? Math.round(call.duration_ms / 1000) : 0,
        aiResponseTime: 0,
        status: "active",
        timestamp: call.start_timestamp ? new Date(call.start_timestamp).toISOString() : new Date().toISOString(),
        transcript: call.transcript || "",
        converted: call.metadata?.converted || false,
      }));
    } catch (error) {
      console.error("Error fetching active Retell calls:", error);
      return [];
    }
  },
};

export const assistantsApi = {
  getAll: async () => {
    try {
      const assistants = await retellApi.getAllAgents();
      
      // Return assistants without fetching all calls to reduce API usage
      // Stats will be calculated on-demand for individual assistants
      return assistants.map(asst => ({
        id: asst.agent_id,
        name: asst.agent_name,
        status: "active",
        totalCalls: 0, // Fetch on-demand for detail view
        avgDuration: 0,
        conversionRate: 0,
        voice: asst.voice_id || "default",
        model: "gpt-4", // Retell uses LLM websocket URL, model info may be in metadata
        temperature: 0.7, // Default, may need to be extracted from metadata
        systemPrompt: "", // Retell uses LLM websocket, system prompt may be in metadata
      }));
    } catch (error) {
      console.error("Error fetching Retell agents:", error);
      return [];
    }
  },

  getById: async (id: string) => {
    try {
      const asst = await retellApi.getAgentById(id);
      const allCalls = await retellApi.getAllCalls({ agent_id: id });
      const completedCalls = allCalls.filter(call => call.call_status === "ended");
      
      const avgDuration = completedCalls.length > 0
        ? Math.round(completedCalls.reduce((sum, call) => sum + (call.duration_ms || 0) / 1000, 0) / completedCalls.length)
        : 0;
      
      const convertedCalls = allCalls.filter(call => call.metadata?.converted === true).length;
      const conversionRate = allCalls.length > 0
        ? Math.round((convertedCalls / allCalls.length) * 100)
        : 0;
      
      return {
        id: asst.agent_id,
        name: asst.agent_name,
        status: "active",
        totalCalls: allCalls.length,
        avgDuration,
        conversionRate,
        voice: asst.voice_id || "default",
        model: "gpt-4", // Retell uses LLM websocket URL, model info may be in metadata
        temperature: 0.7, // Default, may need to be extracted from metadata
        systemPrompt: "", // Retell uses LLM websocket, system prompt may be in metadata
      };
    } catch (error) {
      console.error("Error fetching Retell agent:", error);
      throw error;
    }
  },

  update: async (id: string, data: any) => {
    try {
      await retellApi.updateAgent(id, {
        agent_name: data.name,
        voice_id: data.voice,
        // Note: Retell uses LLM websocket URL for model configuration
        // System prompt and model settings are typically configured via the LLM websocket
        metadata: {
          ...data.metadata,
          systemPrompt: data.systemPrompt,
          model: data.model,
          temperature: data.temperature,
        },
      });
    return { success: true, data };
    } catch (error) {
      console.error("Error updating Retell agent:", error);
      throw error;
    }
  },

  create: async (data: any) => {
    try {
      const assistant = await retellApi.createAgent({
        agent_name: data.name || "New Assistant",
        voice_id: data.voice || "default",
        // Note: Retell requires LLM websocket URL for model configuration
        // System prompt and model settings are typically configured via the LLM websocket
        metadata: {
          systemPrompt: data.systemPrompt || "",
          model: data.model || "gpt-4",
          temperature: data.temperature || 0.7,
        },
      });
      return { success: true, assistant };
    } catch (error) {
      console.error("Error creating Retell agent:", error);
      throw error;
    }
  },

  uploadKnowledgeBase: async (id: string, file: File) => {
    await delay(500);
    return { success: true, fileName: file.name };
  },
};

export const adminApi = {
  getUsers: async () => {
    await delay();
    return mockUsers;
  },

  createUser: async (userData: any) => {
    await delay();
    return { success: true, user: { ...userData, id: "user-" + Date.now() } };
  },

  updateUser: async (id: string, userData: any) => {
    await delay();
    return { success: true, user: userData };
  },

  toggleUserStatus: async (id: string) => {
    await delay();
    return { success: true };
  },

  getOrganizations: async () => {
    await delay();
    return mockOrganizations;
  },

  getApiKeys: async () => {
    await delay();
    return mockApiKeys;
  },

  createApiKey: async (name: string) => {
    await delay();
    return {
      success: true,
      key: {
        id: "key-" + Date.now(),
        name,
        key: "sk_live_" + Math.random().toString(36).substr(2, 32),
        createdAt: new Date().toISOString(),
        lastUsed: null,
      },
    };
  },

  deleteApiKey: async (id: string) => {
    await delay();
    return { success: true };
  },
};


