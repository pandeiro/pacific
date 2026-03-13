// API configuration
// Vite replaces import.meta.env.VITE_* at build time

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4900'

// Helper for making API calls
export async function apiFetch(path: string, options?: RequestInit) {
  const url = `${API_URL}${path}`
  const response = await fetch(url, options)
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`)
  }
  return response.json()
}