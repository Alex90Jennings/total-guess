import axios from 'axios';

const authClient = axios.create({ baseURL: process.env.REACT_APP_DB_URL });
authClient.interceptors.request.use(
    function (config) {
        config.headers.Accept = 'application/json';
        return config;
    },
    function (error) {
        return Promise.reject(error);
    }
);

export { authClient };
