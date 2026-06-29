import api from './client'

export const getSuppliers   = (params = {}) => api.get('/suppliers', { params })
export const getSupplierById = (id)          => api.get(`/suppliers/${id}`)
