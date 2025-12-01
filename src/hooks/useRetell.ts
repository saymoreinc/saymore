import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as retellApi from "@/api/retellApi";
import { RetellCall, RetellAgent, RetellPhoneNumber, StartCallPayload } from "@/api/retellApi";

// ============================
// CALLS HOOKS
// ============================

/**
 * Hook to fetch all calls
 */
export const useRetellCalls = (params?: {
  agent_id?: string;
}) => {
  return useQuery({
    queryKey: ["retell-calls", params],
    queryFn: () => retellApi.getAllCalls(params),
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: false, // Don't refetch on component mount if data exists
  });
};

/**
 * Hook to fetch active calls (only use this when you need real-time updates)
 */
export const useActiveRetellCalls = (enablePolling: boolean = false) => {
  return useQuery({
    queryKey: ["retell-active-calls"],
    queryFn: () => retellApi.getActiveCalls(),
    refetchInterval: enablePolling ? 10000 : false, // Only poll if explicitly enabled (10 seconds)
    staleTime: 10000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to fetch completed calls
 */
export const useCompletedRetellCalls = (limit?: number) => {
  return useQuery({
    queryKey: ["retell-completed-calls", limit],
    queryFn: () => retellApi.getCompletedCalls(limit),
    staleTime: 60000, // Consider data fresh for 1 minute
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to fetch a specific call by ID
 */
export const useRetellCall = (callId: string) => {
  return useQuery({
    queryKey: ["retell-call", callId],
    queryFn: () => retellApi.getCallById(callId),
    enabled: !!callId,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to start a new call
 */
export const useStartRetellCall = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: StartCallPayload) => retellApi.startCall(payload),
    onSuccess: () => {
      // Invalidate calls queries to refetch
      queryClient.invalidateQueries({ queryKey: ["retell-calls"] });
      queryClient.invalidateQueries({ queryKey: ["retell-active-calls"] });
    },
  });
};

/**
 * Hook to end a call
 */
export const useEndRetellCall = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (callId: string) => retellApi.endCall(callId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retell-calls"] });
      queryClient.invalidateQueries({ queryKey: ["retell-active-calls"] });
    },
  });
};

// ============================
// AGENTS HOOKS
// ============================

/**
 * Hook to fetch all agents
 */
export const useRetellAgents = () => {
  return useQuery({
    queryKey: ["retell-agents"],
    queryFn: () => retellApi.getAllAgents(),
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes (agents rarely change)
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

/**
 * Hook to fetch a specific agent by ID
 */
export const useRetellAgent = (agentId: string) => {
  return useQuery({
    queryKey: ["retell-agent", agentId],
    queryFn: () => retellApi.getAgentById(agentId),
    enabled: !!agentId,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to create a new agent
 */
export const useCreateRetellAgent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<RetellAgent>) => retellApi.createAgent(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retell-agents"] });
    },
  });
};

/**
 * Hook to update an agent
 */
export const useUpdateRetellAgent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ agentId, payload }: { agentId: string; payload: Partial<RetellAgent> }) =>
      retellApi.updateAgent(agentId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["retell-agents"] });
      queryClient.invalidateQueries({ queryKey: ["retell-agent", variables.agentId] });
    },
  });
};

/**
 * Hook to delete an agent
 */
export const useDeleteRetellAgent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (agentId: string) => retellApi.deleteAgent(agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retell-agents"] });
    },
  });
};

// ============================
// PHONE NUMBERS HOOKS
// ============================

/**
 * Hook to fetch all phone numbers
 */
export const useRetellPhoneNumbers = () => {
  return useQuery({
    queryKey: ["retell-phone-numbers"],
    queryFn: () => retellApi.getAllPhoneNumbers(),
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to fetch a specific phone number by ID
 */
export const useRetellPhoneNumber = (phoneNumberId: string) => {
  return useQuery({
    queryKey: ["retell-phone-number", phoneNumberId],
    queryFn: () => retellApi.getPhoneNumberById(phoneNumberId),
    enabled: !!phoneNumberId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// ============================
// KNOWLEDGE BASE HOOKS
// ============================

/**
 * Hook to fetch a specific knowledge base by ID
 */
export const useRetellKnowledgeBase = (knowledgeBaseId: string) => {
  return useQuery({
    queryKey: ["retell-knowledge-base", knowledgeBaseId],
    queryFn: () => retellApi.getKnowledgeBase(knowledgeBaseId),
    enabled: !!knowledgeBaseId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// ============================
// ANALYTICS HOOKS
// ============================

/**
 * Hook to fetch call analytics
 */
export const useRetellAnalytics = (params?: {
  startDate?: string;
  endDate?: string;
  agentId?: string;
}) => {
  return useQuery({
    queryKey: ["retell-analytics", params],
    queryFn: () => retellApi.getCallAnalytics(params),
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    refetchOnWindowFocus: false,
  });
};

