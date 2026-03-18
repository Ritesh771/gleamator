import axios from 'axios'

let BASE = '/api/'
if (typeof import.meta !== 'undefined' && import.meta.env) {
  BASE = import.meta.env.VITE_API_BASE || BASE
  // during local development, default to the backend run script address if not provided
  if (import.meta.env.MODE === 'development' && !import.meta.env.VITE_API_BASE) {
    BASE = 'http://127.0.0.1:8080/api/'
  }
}

const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
})

export default api
