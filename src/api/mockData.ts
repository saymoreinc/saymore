// Mock data for the application
export const mockUser = {
  id: "user-1",
  email: "admin@saymore.com",
  name: "Admin User",
  role: "admin" as "admin" | "user",
  organization: "SayMore Inc.",
};

export const mockAssistants = [
  {
    id: "asst-1",
    name: "Sales Assistant",
    status: "active" as const,
    totalCalls: 1247,
    avgDuration: 245,
    conversionRate: 23.5,
    knowledgeBase: "Sales playbook, product information, pricing details",
    calendlyLink: "https://calendly.com/sales-team",
  },
  {
    id: "asst-2",
    name: "Support Assistant",
    status: "active" as const,
    totalCalls: 3421,
    avgDuration: 180,
    conversionRate: 89.2,
    knowledgeBase: "FAQ, troubleshooting guides, documentation",
    calendlyLink: "",
  },
  {
    id: "asst-3",
    name: "Booking Assistant",
    status: "inactive" as const,
    totalCalls: 523,
    avgDuration: 120,
    conversionRate: 67.8,
    knowledgeBase: "Booking policies, availability calendar",
    calendlyLink: "https://calendly.com/booking",
  },
];

export const mockCalls = [
  {
    id: "call-1",
    assistantId: "asst-1",
    assistantName: "Sales Assistant",
    duration: 245,
    status: "completed" as const,
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    phoneNumber: "+1 (555) 123-4567",
    transcript: "Customer inquiry about enterprise pricing...",
    aiResponseTime: 1.2,
    converted: true,
  },
  {
    id: "call-2",
    assistantId: "asst-2",
    assistantName: "Support Assistant",
    duration: 180,
    status: "active" as const,
    timestamp: new Date(Date.now() - 120000).toISOString(),
    phoneNumber: "+1 (555) 234-5678",
    transcript: "Technical support request in progress...",
    aiResponseTime: 0.8,
    converted: false,
  },
  {
    id: "call-3",
    assistantId: "asst-1",
    assistantName: "Sales Assistant",
    duration: 320,
    status: "completed" as const,
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    phoneNumber: "+1 (555) 345-6789",
    transcript: "Product demo and pricing discussion...",
    aiResponseTime: 1.5,
    converted: true,
  },
  {
    id: "call-4",
    assistantId: "asst-3",
    assistantName: "Booking Assistant",
    duration: 95,
    status: "failed" as const,
    timestamp: new Date(Date.now() - 10800000).toISOString(),
    phoneNumber: "+1 (555) 456-7890",
    transcript: "Call disconnected during booking...",
    aiResponseTime: 2.1,
    converted: false,
  },
];

export const mockUsers = [
  {
    id: "user-1",
    name: "Admin User",
    email: "admin@saymore.com",
    role: "admin" as const,
    organization: "SayMore Inc.",
    status: "active" as const,
    createdAt: "2024-01-15",
  },
  {
    id: "user-2",
    name: "John Smith",
    email: "john@company.com",
    role: "user" as const,
    organization: "Company A",
    status: "active" as const,
    createdAt: "2024-02-20",
  },
  {
    id: "user-3",
    name: "Sarah Johnson",
    email: "sarah@business.com",
    role: "user" as const,
    organization: "Business B",
    status: "inactive" as const,
    createdAt: "2024-03-10",
  },
];

export const mockOrganizations = [
  { id: "org-1", name: "SayMore Inc.", users: 1, assistants: 3, status: "active" as const },
  { id: "org-2", name: "Company A", users: 5, assistants: 2, status: "active" as const },
  { id: "org-3", name: "Business B", users: 3, assistants: 1, status: "inactive" as const },
];

export const mockApiKeys = [
  {
    id: "key-1",
    name: "Production API Key",
    key: "",
    createdAt: "2024-01-15T10:00:00Z",
    lastUsed: "2024-03-20T14:30:00Z",
  },
  {
    id: "key-2",
    name: "Development API Key",
    key: "",
    createdAt: "2024-02-01T09:00:00Z",
    lastUsed: "2024-03-19T16:45:00Z",
  },
  {
    id: "key-3",
    name: "Backup API Key",
    key: "",
    createdAt: "2024-02-15T11:00:00Z",
    lastUsed: null,
  },
];

export const mockChartData = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  }),
  calls: Math.floor(Math.random() * 100) + 50,
  conversions: Math.floor(Math.random() * 40) + 10,
}));
