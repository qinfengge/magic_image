import { ApiConfig, GeneratedImage, CustomModel, ModelType, ModelTag } from "@/types"

const STORAGE_KEYS = {
  API_CONFIG: 'ai-drawing-api-config',
  HISTORY: 'ai-drawing-history',
  CUSTOM_MODELS: 'ai-drawing-custom-models'
}

// 默认模型配置
const DEFAULT_MODELS: CustomModel[] = [
  {
    id: 'default-fal-flux-pro',
    name: 'FAL FLUX Pro',
    value: 'fal-ai/flux-pro',
    type: ModelType.FAL,
    tag: ModelTag.TEXT_TO_IMAGE,
    createdAt: new Date().toISOString(),
    isDefault: true
  }
]

export const storage = {
  // API 配置相关操作
  getApiConfig: (): ApiConfig | null => {
    if (typeof window === 'undefined') return null
    const data = localStorage.getItem(STORAGE_KEYS.API_CONFIG)
    return data ? JSON.parse(data) : null
  },

  setApiConfig: (key: string, baseUrl: string = ""): void => {
    if (typeof window === 'undefined') return
    const apiConfig: ApiConfig = {
      key,
      baseUrl,
      createdAt: new Date().toISOString()
    }
    localStorage.setItem(STORAGE_KEYS.API_CONFIG, JSON.stringify(apiConfig))
  },

  removeApiConfig: (): void => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(STORAGE_KEYS.API_CONFIG)
  },

  // 历史记录相关操作
  getHistory: (): GeneratedImage[] => {
    if (typeof window === 'undefined') return []
    const data = localStorage.getItem(STORAGE_KEYS.HISTORY)
    return data ? JSON.parse(data) : []
  },

  addToHistory: (image: GeneratedImage): void => {
    if (typeof window === 'undefined') return
    const history = storage.getHistory()
    history.unshift(image)
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history))
  },

  clearHistory: (): void => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(STORAGE_KEYS.HISTORY)
  },

  removeFromHistory: (id: string): void => {
    if (typeof window === 'undefined') return
    const history = storage.getHistory()
    const filtered = history.filter(img => img.id !== id)
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(filtered))
  },

  // 自定义模型相关操作
  getCustomModels: (): CustomModel[] => {
    if (typeof window === 'undefined') return DEFAULT_MODELS
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOM_MODELS)
    const customModels: CustomModel[] = data ? JSON.parse(data) : []
    
    // 合并默认模型和自定义模型
    const allModels = [...DEFAULT_MODELS, ...customModels]
    
    // 去重（以id为准）
    const uniqueModels = allModels.filter((model: CustomModel, index: number, self: CustomModel[]) => 
      index === self.findIndex((m: CustomModel) => m.id === model.id)
    )
    
    return uniqueModels
  },

  addCustomModel: (model: CustomModel): void => {
    if (typeof window === 'undefined') return
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOM_MODELS)
    const customModels: CustomModel[] = data ? JSON.parse(data) : []
    customModels.push(model)
    localStorage.setItem(STORAGE_KEYS.CUSTOM_MODELS, JSON.stringify(customModels))
  },

  removeCustomModel: (id: string): void => {
    if (typeof window === 'undefined') return
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOM_MODELS)
    const customModels: CustomModel[] = data ? JSON.parse(data) : []
    const filtered = customModels.filter((model: CustomModel) => model.id !== id)
    localStorage.setItem(STORAGE_KEYS.CUSTOM_MODELS, JSON.stringify(filtered))
  },

  updateCustomModel: (id: string, updated: Partial<CustomModel>): void => {
    if (typeof window === 'undefined') return
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOM_MODELS)
    const customModels: CustomModel[] = data ? JSON.parse(data) : []
    const index = customModels.findIndex((model: CustomModel) => model.id === id)
    if (index !== -1) {
      customModels[index] = { ...customModels[index], ...updated }
      localStorage.setItem(STORAGE_KEYS.CUSTOM_MODELS, JSON.stringify(customModels))
    }
  }
} 