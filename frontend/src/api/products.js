import api from './client'

export const getProducts      = (params = {}) => api.get('/products', { params })
export const getProductById   = (id)          => api.get(`/products/${id}`)
export const createProduct    = (body)        => api.post('/products', body)
export const deactivateProduct  = (id)         => api.delete(`/products/${id}`)
export const reactivateProduct  = (id)         => api.patch(`/products/${id}/reactivate`)
