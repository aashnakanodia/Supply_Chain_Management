import api from './client'

export const getWarehouses   = (params = {}) => api.get('/warehouses', { params })
export const getWarehouseById = (id)          => api.get(`/warehouses/${id}`)
