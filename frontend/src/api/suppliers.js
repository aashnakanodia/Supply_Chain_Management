import api from './client'

export const getSuppliers    = (params = {}) => api.get('/suppliers', { params })
export const getSupplierById = (id)           => api.get(`/suppliers/${id}`)
export const createSupplier  = (body)         => api.post('/suppliers', body)
export const updateSupplier  = (id, body)     => api.patch(`/suppliers/${id}`, body)
