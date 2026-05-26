import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`;

const client = axios.create({
  baseURL,
});

client.interceptors.request.use((config) => {
  const auth = JSON.parse(localStorage.getItem('hotelAuth') || 'null');
  if (auth?.token) {
    config.headers.Authorization = `Bearer ${auth.token}`;
  }
  return config;
});

export default client;
