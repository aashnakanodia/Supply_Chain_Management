import api from './client'

export const getInventory  = (params = {}) => api.get('/inventory', { params })
export const getInventoryById = (id)       => api.get(`/inventory/${id}`)
export const adjustInventory  = (id, body) => api.post(`/inventory/${id}/adjust`, body)
export const createInventory  = (body)     => api.post('/inventory', body)
