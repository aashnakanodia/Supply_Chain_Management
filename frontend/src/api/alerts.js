import api from './client'

export const getAlerts    = (params = {}) => api.get('/alerts', { params })
export const markAlertRead = (id)          => api.patch(`/alerts/${id}/read`)
export const resolveAlert  = (id)          => api.patch(`/alerts/${id}/resolve`)
