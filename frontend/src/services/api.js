import axios from 'axios';

// Use the backend API URL
const API_URL = process.env.REACT_APP_API_URL || 'https://partymembersbackendnew.onrender.com/api';

// Create axios instance with longer timeout for large requests
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000, // Reduced to 30 seconds for better UX
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
  getFiles: async () => {
    try {
      const response = await axiosInstance.get('/files');
      return response.data;
    } catch (error) {
      console.error('Error fetching files:', error);
      throw error;
    }
  },

  uploadFiles: async (formData) => {
    try {
      const response = await axiosInstance.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // Longer timeout for uploads
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
  requestDownload: async (data) => {
    try {
      // Validate data before sending
      if (!data.name || !data.email || !data.phone) {
        throw new Error('Name, email, and phone are required');
      }
      
      const response = await axiosInstance.post('/downloads/request', data, {
        timeout: 15000, // 15 seconds for download request
      });
      return response.data;
    } catch (error) {
      console.error('Request download error:', error);
      // Provide more specific error messages
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      if (error.response?.status === 404) {
        throw new Error('Download service not available. Please try again later.');
      }
      if (error.response?.status === 400) {
        throw new Error(error.response?.data?.message || 'Invalid request. Please check your details.');
      }
      throw error;
    }
  },

  checkDownloadStatus: async (token) => {
    try {
      const response = await axiosInstance.get(`/downloads/status/${token}`);
      return response.data;
    } catch (error) {
      console.error('Check download status error:', error);
      throw error;
    }
  },

  downloadFile: async (token) => {
    try {
      const response = await axiosInstance.get(`/downloads/file/${token}`, {
        responseType: 'blob',
        timeout: 60000, // 60 seconds for file download
      });
      return response;
    } catch (error) {
      console.error('Download file error:', error);
      throw error;
    }
  },

  getDownloadRequests: async () => {
    try {
      const response = await axiosInstance.get('/downloads/requests');
      return response.data;
    } catch (error) {
      console.error('Get download requests error:', error);
      throw error;
    }
  },

  approveDownload: async (id) => {
    try {
      const response = await axiosInstance.post(`/downloads/approve/${id}`);
      return response.data;
    } catch (error) {
      console.error('Approve download error:', error);
      throw error;
    }
  },

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
