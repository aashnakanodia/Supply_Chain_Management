import api from './client'

export const getShipments    = (params = {}) => api.get('/shipments', { params })
export const getShipmentById = (id)           => api.get(`/shipments/${id}`)
export const createShipment  = (body)         => api.post('/shipments', body)
export const updateShipmentStatus = (id, body) => api.patch(`/shipments/${id}/status`, body)
