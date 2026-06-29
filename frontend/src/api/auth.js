import api from './client'

export const login          = (email, password)   => api.post('/auth/login',           { email, password })
export const register       = (body)               => api.post('/auth/register',         body)
export const refreshToken   = (refreshToken)       => api.post('/auth/refresh',          { refreshToken })
export const getMe          = ()                   => api.get('/auth/me')
export const changePassword = (currentPassword, newPassword) =>
  api.post('/auth/change-password', { currentPassword, newPassword })
export const forgotPassword = (email)              => api.post('/auth/forgot-password',  { email })
export const resetPassword  = (token, newPassword) => api.post('/auth/reset-password',   { token, newPassword })
