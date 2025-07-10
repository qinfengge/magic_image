export interface GeneratedImage {
  id: string
  prompt: string
  url: string
  model: string
  createdAt: string
  aspectRatio: string
}

export interface ApiConfig {
  key: string
  baseUrl: string
  createdAt: string
  lastUsed?: string
}

export interface DalleImageData {
  url?: string
  b64_json?: string
}

// 模型类型枚举
export enum ModelType {
  OPENAI = 'openai',
  FAL = 'fal'
}

// 模型标签枚举
export enum ModelTag {
  TEXT_TO_IMAGE = 'text_to_image',
  IMAGE_TO_IMAGE = 'image_to_image',
  TEXT_TO_VIDEO = 'text_to_video',
  IMAGE_TO_VIDEO = 'image_to_video'
}

// 自定义模型接口
export interface CustomModel {
  id: string
  name: string
  value: string
  type: ModelType
  tag?: ModelTag  // 标签变为可选，只有FAL格式才有
  createdAt: string
  isDefault?: boolean
}

export type GenerationModel = 'sora_image' | 'gpt_4o_image' | 'gpt-image-1' | 'dall-e-3' | 'fal-flux-pro' | string
export type AspectRatio = 'original' | '1:1' | '16:9' | '9:16' | '2:3' | '3:2' | '4:5' | '5:4' | '3:4' | '4:3' | '21:9' | '9:21'
export type ImageSize = '1024x1024' | '1536x1024' | '1024x1536' | 'auto' | '1792x1024'

export interface GenerateImageRequest {
  prompt: string
  model: GenerationModel
  modelType?: ModelType
  sourceImage?: string
  sourceImages?: string[]
  isImageToImage?: boolean
  aspectRatio?: AspectRatio
  size?: ImageSize
  n?: number
  quality?: 'auto' | 'high' | 'medium' | 'low' | 'hd' | 'standard'
  mask?: string
  enableSafetyChecker?: boolean
  safetyTolerance?: '1' | '2' | '3' | '4' | '5' | '6'
  duration?: '5' | '10'
} 