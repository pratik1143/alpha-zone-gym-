import axios from 'axios';
import { auth } from '../lib/firebase';

const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to attach Firebase ID Token
API.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined') {
    let token = null;

    // 1. Try to get the latest token from active Firebase Auth session
    if (auth.currentUser) {
      try {
        token = await auth.currentUser.getIdToken();
      } catch (err) {
        console.warn('Failed to retrieve token from active Firebase session:', err);
      }
    }

    // 2. Fallback to localStorage if Firebase isn't initialized/ready yet
    if (!token) {
      const userJson = localStorage.getItem('alpha_zone_user');
      if (userJson) {
        const user = JSON.parse(userJson);
        token = user.token;
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor to handle authentication errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      const errorMessage = error.response.data?.error || '';

      const isAuthError =
        status === 401 ||
        (status === 403 && (
          errorMessage.includes('Token') ||
          errorMessage.includes('Authentication') ||
          errorMessage.includes('decode') ||
          errorMessage.includes('decoding')
        ));

      if (isAuthError) {
        console.warn('Authentication token invalid or expired. Logging out...');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('alpha_zone_user');
          window.location.href = '/';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default API;
