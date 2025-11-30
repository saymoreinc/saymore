import axios from "axios";

// Create Retell AI API client instance
// Update the API key below with your actual Retell AI API key from https://dashboard.retellai.com/
export const retell = axios.create({
  baseURL: "https://api.retellai.com",
  headers: {
    Authorization: `Bearer ${import.meta.env.VITE_RETELL_API_KEY || ''}`, // Get from environment variables
    "Content-Type": "application/json",
  },
});

// Add request interceptor for debugging (optional)
retell.interceptors.request.use(
  (config) => {
    console.log("Retell AI API Request:", config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
retell.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error("Retell AI API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

