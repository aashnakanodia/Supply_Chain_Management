import api from './client'

export const getUsers       = (params = {}) => api.get('/users', { params })
export const getUserById    = (id)           => api.get(`/users/${id}`)
export const updateUser     = (id, body)     => api.patch(`/users/${id}`, body)
export const changeUserRole = (id, role)     => api.patch(`/users/${id}/role`, { role })
