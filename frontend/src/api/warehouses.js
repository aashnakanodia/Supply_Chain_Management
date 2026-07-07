import api from './client'

export const getWarehouses    = (params = {}) => api.get('/warehouses', { params })
export const getWarehouseById = (id)           => api.get(`/warehouses/${id}`)
export const createWarehouse  = (body)         => api.post('/warehouses', body)
export const updateWarehouse  = (id, body)     => api.patch(`/warehouses/${id}`, body)
