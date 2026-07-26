import axios from 'axios';

// Use the backend API URL
const API_URL = process.env.REACT_APP_API_URL || 'https://partymembersbackendnew.onrender.com/api';

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

// Handle auth errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const publicPaths = ['/data', '/home', '/', '/request-download'];
      const currentPath = window.location.pathname;
      
      // Only redirect to login if not on public pages
      if (!publicPaths.includes(currentPath) && !currentPath.startsWith('/district') && !currentPath.startsWith('/download')) {
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
  // ==================== AUTH ====================
  login: async (email, password) => {
    try {
      const response = await axiosInstance.post('/auth/login', { email, password });
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  verifyToken: async () => {
    try {
      const response = await axiosInstance.get('/auth/verify');
      return response.data;
    } catch (error) {
      console.error('Token verification error:', error);
      throw error;
    }
  },

  // ==================== FILES ====================
  // Public view
  getFiles: async () => {
    try {
      const response = await axiosInstance.get('/files');
      return response.data;
    } catch (error) {
      console.error('Error fetching files:', error);
      throw error;
    }
  },

  // Admin only
  uploadFiles: async (formData) => {
    try {
      const response = await axiosInstance.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  },

  deleteFile: async (fileId) => {
    try {
      const response = await axiosInstance.delete(`/files/${fileId}`);
      return response.data;
    } catch (error) {
      console.error('Delete error:', error);
      throw error;
    }
  },

  // ==================== RECORDS ====================
  // Public view
  getRecordsByFileId: async (fileId) => {
    try {
      const response = await axiosInstance.get(`/records/file/${fileId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching records by file:', error);
      throw error;
    }
  },

  getAllRecords: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/records', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching all records:', error);
      throw error;
    }
  },

  searchRecords: async (query, field = null) => {
    try {
      const params = { q: query, transliterate: true };
      if (field) params.field = field;
      const response = await axiosInstance.get('/records/search', { params });
      return response.data;
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  },

  // Admin only
  updateRecord: async (id, data) => {
    try {
      const response = await axiosInstance.put(`/records/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Update error:', error);
      throw error;
    }
  },

  exportRecords: async (fileId = null) => {
    try {
      const params = fileId ? { fileId } : {};
      const response = await axiosInstance.get('/records/export', { params });
      return response.data;
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  },

  // ==================== DOWNLOAD REQUESTS ====================
  // Public - Request download
  requestDownload: async (data) => {
    try {
      const response = await axiosInstance.post('/downloads/request', data);
      return response.data;
    } catch (error) {
      console.error('Request download error:', error);
      throw error;
    }
  },

  // Public - Check download status
  checkDownloadStatus: async (token) => {
    try {
      const response = await axiosInstance.get(`/downloads/status/${token}`);
      return response.data;
    } catch (error) {
      console.error('Check download status error:', error);
      throw error;
    }
  },

  // Public - Download file with token
  downloadFile: async (token) => {
    try {
      const response = await axiosInstance.get(`/downloads/file/${token}`, {
        responseType: 'blob'
      });
      return response;
    } catch (error) {
      console.error('Download file error:', error);
      throw error;
    }
  },

  // Admin only - Get all download requests
  getDownloadRequests: async () => {
    try {
      const response = await axiosInstance.get('/downloads/requests');
      return response.data;
    } catch (error) {
      console.error('Get download requests error:', error);
      throw error;
    }
  },

  // Admin only - Approve download request
  approveDownload: async (id) => {
    try {
      const response = await axiosInstance.post(`/downloads/approve/${id}`);
      return response.data;
    } catch (error) {
      console.error('Approve download error:', error);
      throw error;
    }
  },

  // Admin only - Reject download request
  rejectDownload: async (id, reason) => {
    try {
      const response = await axiosInstance.post(`/downloads/reject/${id}`, { reason });
      return response.data;
    } catch (error) {
      console.error('Reject download error:', error);
      throw error;
    }
  },
};

export default api;
