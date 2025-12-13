import axios from 'axios'
import type { TEAInput, TEAResult, TEATemplate, Project } from '@/types/tea'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// TEA API
export const teaApi = {
  calculate: async (input: TEAInput): Promise<TEAResult> => {
    const response = await api.post<TEAResult>('/tea/calculate', input)
    return response.data
  },

  quickLcoe: async (params: {
    capacity_mw: number
    capex_per_kw: number
    opex_per_kw_year: number
    capacity_factor?: number
    lifetime_years?: number
    discount_rate?: number
  }): Promise<{ lcoe: number; total_capex: number; annual_production_mwh: number }> => {
    const response = await api.post('/tea/quick-lcoe', null, { params })
    return response.data
  },

  getTemplates: async (): Promise<{ templates: TEATemplate[] }> => {
    const response = await api.get('/tea/templates')
    return response.data
  },
}

// Projects API
export const projectsApi = {
  list: async (params?: {
    status?: string
    technology_type?: string
    limit?: number
    offset?: number
  }): Promise<Project[]> => {
    const response = await api.get<Project[]>('/projects', { params })
    return response.data
  },

  get: async (id: string): Promise<Project> => {
    const response = await api.get<Project>(`/projects/${id}`)
    return response.data
  },

  create: async (project: {
    name: string
    description?: string
    technology_type: string
  }): Promise<Project> => {
    const response = await api.post<Project>('/projects', project)
    return response.data
  },

  update: async (id: string, updates: Partial<Project>): Promise<Project> => {
    const response = await api.patch<Project>(`/projects/${id}`, updates)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/projects/${id}`)
  },
}

// Upload API
export const uploadApi = {
  upload: async (file: File, projectId?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (projectId) {
      formData.append('project_id', projectId)
    }

    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  validate: async (uploadId: string) => {
    const response = await api.post(`/upload/${uploadId}/validate`)
    return response.data
  },

  mapColumns: async (uploadId: string, mapping: Record<string, string>) => {
    const response = await api.post(`/upload/${uploadId}/map-columns`, mapping)
    return response.data
  },
}

// Health API
export const healthApi = {
  check: async (): Promise<{ status: string; service: string; version: string }> => {
    const response = await api.get('/health')
    return response.data
  },
}

export default api
