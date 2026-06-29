import api from './client'

export const getStockMovements = (params = {}) => api.get('/stock-movements', { params })
