import axios from 'axios';

export const client = axios.create({ baseURL: process.env.REACT_APP_DB_URL });
client.interceptors.request.use(
  (config) => {
    const jwtToken = localStorage.getItem('tgJwtToken');
    config.headers.Accept = 'application/json';
    if (jwtToken) {
      config.headers.Authorization = `Bearer ${jwtToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
