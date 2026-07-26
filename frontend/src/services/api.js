import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Add token to requests if available
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle auth errors - only redirect if not on public pages
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const publicPaths = ['/data', '/home', '/'];
      const currentPath = window.location.pathname;
      
      // Only redirect to login if not on public pages
      if (!publicPaths.includes(currentPath) && !currentPath.startsWith('/district')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API methods
export const api = {
  // Auth
  login: async (email, password) => {
    const response = await axiosInstance.post('/auth/login', { email, password });
    return response.data;
  },

  verifyToken: async () => {
    const response = await axiosInstance.get('/auth/verify');
    return response.data;
  },

  // Files - Public view, Admin upload/delete
  getFiles: async () => {
    const response = await axiosInstance.get('/files');
    return response.data;
  },

  uploadFiles: async (formData) => {
    const response = await axiosInstance.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteFile: async (fileId) => {
    const response = await axiosInstance.delete(`/files/${fileId}`);
    return response.data;
  },

  // Records - Public view, Admin edit
  getRecordsByFileId: async (fileId) => {
    const response = await axiosInstance.get(`/records/file/${fileId}`);
    return response.data;
  },

  getAllRecords: async (params = {}) => {
    const response = await axiosInstance.get('/records', { params });
    return response.data;
  },

  searchRecords: async (query, field = null) => {
    const params = { q: query, transliterate: true };
    if (field) params.field = field;
    const response = await axiosInstance.get('/records/search', { params });
    return response.data;
  },

  // Records - Admin only
  updateRecord: async (id, data) => {
    const response = await axiosInstance.put(`/records/${id}`, data);
    return response.data;
  },

  exportRecords: async (fileId = null) => {
    const params = fileId ? { fileId } : {};
    const response = await axiosInstance.get('/records/export', { params });
    return response.data;
  },
};

export default api;