import api from './client'

export const getProducts   = (params = {}) => api.get('/products', { params })
export const getProductById = (id)          => api.get(`/products/${id}`)
