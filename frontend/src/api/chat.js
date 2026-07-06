import api from './client'

export const listSessions   = ()           => api.get('/chat/sessions')
export const createSession  = (title)      => api.post('/chat/sessions', { title })
export const deleteSession  = (id)         => api.delete(`/chat/sessions/${id}`)
export const getMessages    = (sessionId)  => api.get(`/chat/sessions/${sessionId}/messages`)
export const sendMessage    = (sessionId, content) =>
  api.post(`/chat/sessions/${sessionId}/messages`, { content })
