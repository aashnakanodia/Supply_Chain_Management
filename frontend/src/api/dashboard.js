import api from './client'

export const getDashboard = () => api.get('/dashboard')
