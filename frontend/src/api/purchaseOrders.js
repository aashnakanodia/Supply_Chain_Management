import api from './client'

export const getPurchaseOrders  = (params = {}) => api.get('/purchase-orders', { params })
export const getPurchaseOrderById = (id)         => api.get(`/purchase-orders/${id}`)
export const createPurchaseOrder  = (body)       => api.post('/purchase-orders', body)
export const approvePurchaseOrder = (id)         => api.post(`/purchase-orders/${id}/approve`)
export const updatePOStatus       = (id, status) => api.patch(`/purchase-orders/${id}/status`, { status })
