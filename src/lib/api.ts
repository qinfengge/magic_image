import { storage } from "./storage"
import { GenerationModel, AspectRatio, ImageSize, DalleImageData, ModelType } from "@/types"
import { toast } from "sonner"
import { AlertCircle } from "lucide-react"
import { fal } from "@fal-ai/client"

export interface GenerateImageRequest {
  prompt: string
  model: GenerationModel
  modelType?: ModelType
  sourceImage?: string
  isImageToImage?: boolean
  aspectRatio?: AspectRatio
  size?: ImageSize
  n?: number
  quality?: 'high' | 'medium' | 'low' | 'hd' | 'standard'| 'auto'
  mask?: string
  sourceImages?: string[]
  enableSafetyChecker?: boolean
  safetyTolerance?: '1' | '2' | '3' | '4' | '5' | '6'
  duration?: '5' | '10'
}

export interface StreamCallback {
  onMessage: (content: string) => void
  onComplete: (imageUrl: string) => void
  onError: (error: string) => void
}

export interface DalleImageResponse {
  data: Array<DalleImageData>
  created: number
}

const showErrorToast = (message: string) => {
  toast.error(message, {
    style: { color: '#EF4444' },  // text-red-500
    duration: 5000
  })
}

// 文件大小检查常量（1.5MB阈值）
const FILE_SIZE_THRESHOLD = 1.5 * 1024 * 1024

// 将base64转换为File对象
const base64ToFile = (base64: string, filename: string = 'image.png'): File => {
  const arr = base64.split(',')
  const mime = arr[0].match(/:(.*?);/)![1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new File([u8arr], filename, { type: mime })
}

// 获取base64图片大小（字节）
const getBase64Size = (base64: string): number => {
  const arr = base64.split(',')
  const bstr = atob(arr[1])
  return bstr.length
}

// 上传文件到FAL存储
const uploadToFalStorage = async (base64: string): Promise<string> => {
  try {
    const file = base64ToFile(base64)
    const url = await fal.storage.upload(file)
    return url
  } catch (error) {
    console.error('FAL storage upload failed:', error)
    throw new Error('上传文件到FAL存储失败')
  }
}

// 处理图片参数：小文件使用base64，大文件上传到FAL存储
const processImageParam = async (base64: string): Promise<string> => {
  const size = getBase64Size(base64)
  console.log(`图片大小: ${(size / 1024 / 1024).toFixed(2)}MB`)
  
  if (size > FILE_SIZE_THRESHOLD) {
    console.log('图片过大，上传到FAL存储')
    return await uploadToFalStorage(base64)
  } else {
    console.log('图片较小，使用base64')
    return base64
  }
}

// 辅助函数，构建请求URL
const buildRequestUrl = (baseUrl: string, endpoint: string): string => {
  // 如果URL以#结尾，则使用完整的baseUrl，不添加后缀
  if (baseUrl.endsWith('#')) {
    return baseUrl.slice(0, -1); // 移除#号
  }
  // 否则按常规方式拼接endpoint
  return `${baseUrl}${endpoint}`;
}

export const api = {
  generateFalImage: async (request: GenerateImageRequest): Promise<{ imageUrl: string }> => {
    try {
      // 配置 fal 客户端
      const config = storage.getApiConfig()
      let apiKey = config?.key
      
      // 如果没有配置，使用默认密钥
      if (!apiKey) {
        apiKey = "efcd5ad0-f538-4898-9bb5-7b6586071e8a:a656dd5786e8413f1f008f4a0851df20"
      }

      // 配置 fal 客户端
      fal.config({
        credentials: apiKey
      })

      // 处理图片参数
      let processedImageUrl: string | undefined
      if (request.sourceImages && request.sourceImages.length > 0) {
        processedImageUrl = await processImageParam(request.sourceImages[0])
      }

      const result = await fal.subscribe(request.model, {
        input: {
          prompt: request.prompt,
          ...(processedImageUrl && {
            image_url: processedImageUrl
          }),
          num_images: request.n || 1,
          ...(request.aspectRatio !== "original" && {
            aspect_ratio: request.aspectRatio === "1:1" ? "1:1" : 
                         request.aspectRatio === "16:9" ? "16:9" : 
                         request.aspectRatio === "9:16" ? "9:16" :
                         request.aspectRatio === "2:3" ? "2:3" :
                         request.aspectRatio === "3:2" ? "3:2" :
                         request.aspectRatio === "4:5" ? "4:5" :
                         request.aspectRatio === "5:4" ? "5:4" :
                         request.aspectRatio === "3:4" ? "3:4" :
                         request.aspectRatio === "4:3" ? "4:3" :
                         request.aspectRatio === "21:9" ? "21:9" :
                         request.aspectRatio === "9:21" ? "9:21" : "1:1"
          }),
          ...(request.duration && {
            duration: parseInt(request.duration)
          }),
          output_format: "png",
          enable_safety_checker: request.enableSafetyChecker !== false,
          safety_tolerance: request.safetyTolerance || "2"
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            console.log("生成进度:", update.status)
          }
        }
      })

      if (result.data?.images?.[0]?.url) {
        return { imageUrl: result.data.images[0].url }
      } else if (result.data?.video?.url) {
        return { imageUrl: result.data.video.url }
      } else if (result.data?.url) {
        return { imageUrl: result.data.url }
      } else {
        console.log('FAL API 响应数据:', result)
        throw new Error('生成失败：无效的响应数据')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '生成图片失败'
      showErrorToast(errorMessage)
      throw new Error(errorMessage)
    }
  },

  generateDalleImage: async (request: GenerateImageRequest): Promise<DalleImageResponse> => {
    const config = storage.getApiConfig()
    if (!config) {
      showErrorToast("请先设置 API 配置")
      throw new Error('请先设置 API 配置')
    }

    if (!config.key || !config.baseUrl) {
      showErrorToast("API 配置不完整，请检查 API Key 和基础地址")
      throw new Error('API 配置不完整')
    }

    // 根据模型类型构建不同的请求URL
    const modelType = request.modelType || ModelType.OPENAI
    const endpoint = '/v1/images/generations'

    const requestUrl = buildRequestUrl(config.baseUrl, endpoint);

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.key}`
      },
      body: JSON.stringify({
        model: request.model,
        prompt: request.prompt,
        size: request.size || 'auto',
        n: request.n || 1,
        quality: request.quality
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      const errorMessage = errorData.message || errorData.error?.message || '生成图片失败'
      const errorCode = errorData.code || errorData.error?.code
      const fullError = `${errorMessage}${errorCode ? `\n错误代码: ${errorCode}` : ''}`
      showErrorToast(fullError)
      throw new Error(fullError)
    }

    return response.json()
  },

  editDalleImage: async (request: GenerateImageRequest): Promise<DalleImageResponse> => {
    const config = storage.getApiConfig()
    if (!config) {
      showErrorToast("请先设置 API 配置")
      throw new Error('请先设置 API 配置')
    }

    if (!config.key || !config.baseUrl) {
      showErrorToast("API 配置不完整，请检查 API Key 和基础地址")
      throw new Error('API 配置不完整')
    }

    if (!request.sourceImage) {
      showErrorToast("请先上传图片")
      throw new Error('请先上传图片')
    }

    try {
      // 根据模型类型构建不同的请求URL
      const modelType = request.modelType || ModelType.OPENAI
      const endpoint = '/v1/images/edits'

      // 创建 FormData
      const formData = new FormData()
      formData.append('prompt', request.prompt)
      console.log(request.sourceImage)
      // 处理源图片
      const sourceImageResponse = await fetch(request.sourceImage)
      if (!sourceImageResponse.ok) {
        throw new Error('获取源图片失败')
      }
      const sourceImageBlob = await sourceImageResponse.blob()
      formData.append('image', sourceImageBlob, 'image.png')
      
      // 处理遮罩图片
      if (request.mask) {
        console.log(request.mask)
        const maskResponse = await fetch(request.mask)
        if (!maskResponse.ok) {
          throw new Error('获取遮罩图片失败')
        }
        const maskBlob = await maskResponse.blob()
        formData.append('mask', maskBlob, 'mask.png')
      }

      formData.append('model', request.model)
      if (request.size) formData.append('size', request.size)
      if (request.n) formData.append('n', request.n.toString())
      if (request.quality) formData.append('quality', request.quality)

      const requestUrl = buildRequestUrl(config.baseUrl, endpoint);

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.key}`
        },
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.message || errorData.error?.message || '编辑图片失败'
        const errorCode = errorData.code || errorData.error?.code
        const fullError = `${errorMessage}${errorCode ? `\n错误代码: ${errorCode}` : ''}`
        showErrorToast(fullError)
        throw new Error(fullError)
      }

      return response.json()
    } catch (error) {
      if (error instanceof Error) {
        showErrorToast(error.message)
        throw error
      }
      const errorMessage = '编辑图片失败'
      showErrorToast(errorMessage)
      throw new Error(errorMessage)
    }
  },

  generateStreamImage: async (request: GenerateImageRequest, callbacks: StreamCallback) => {
    const config = storage.getApiConfig()
    if (!config) {
      const error = '请先设置 API 配置'
      showErrorToast(error)
      callbacks.onError(error)
      return
    }

    if (!config.key || !config.baseUrl) {
      const error = 'API 配置不完整，请检查 API Key 和基础地址'
      showErrorToast(error)
      callbacks.onError(error)
      return
    }

    // 多图片支持：修改消息构建逻辑
    const messages = request.isImageToImage ? [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: request.prompt
          },
          // 如果有sourceImages数组，使用所有图片
          ...(Array.isArray(request.sourceImages) ? 
            request.sourceImages.map(imgUrl => ({
              type: 'image_url',
              image_url: { url: imgUrl }
            })) : 
            // 兼容旧代码，如果只有单张图片
            request.sourceImage ? [{
              type: 'image_url',
              image_url: { url: request.sourceImage }
            }] : [])
        ]
      }
    ] : [
      {
        role: 'user',
        content: request.prompt
      }
    ]

    // 根据模型类型构建不同的请求URL
    const modelType = request.modelType || ModelType.OPENAI
    const endpoint = '/v1/chat/completions'

    // 根据模型类型构建不同的请求体
    const requestBody = {
      model: request.model,
      messages,
      stream: true
    }

    const requestUrl = buildRequestUrl(config.baseUrl, endpoint);

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.key}`
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      try {
        const errorData = await response.json()
        const errorMessage = errorData.message || errorData.error?.message || '生成图片失败'
        const errorCode = errorData.code || errorData.error?.code
        const fullError = `${errorMessage}${errorCode ? `\n错误代码: ${errorCode}` : ''}`
        callbacks.onError(fullError)
        showErrorToast(fullError)
      } catch {
        const error = '生成图片失败'
        callbacks.onError(error)
        showErrorToast(error)
      }
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      callbacks.onError('读取响应失败')
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine || trimmedLine === 'data: [DONE]') continue

          try {
            const jsonStr = trimmedLine.replace(/^data: /, '')
            const data = JSON.parse(jsonStr)

            if (data.choices?.[0]?.delta?.content) {
              const content = data.choices[0].delta.content
              callbacks.onMessage(content)

              const urlMatch = content.match(/\[.*?\]\((.*?)\)/)
              if (urlMatch && urlMatch[1]) {
                callbacks.onComplete(urlMatch[1])
                return
              }
            }
          } catch (e) {
            console.warn('解析数据行失败:', e)
          }
        }
      }

      if (buffer.trim()) {
        try {
          const jsonStr = buffer.trim().replace(/^data: /, '')
          const data = JSON.parse(jsonStr)
          if (data.choices?.[0]?.delta?.content) {
            const content = data.choices[0].delta.content
            callbacks.onMessage(content)

            const urlMatch = content.match(/\[.*?\]\((.*?)\)/)
            if (urlMatch && urlMatch[1]) {
              callbacks.onComplete(urlMatch[1])
            }
          }
        } catch (e) {
          console.warn('解析最后的数据失败:', e)
        }
      }
    } catch (error) {
      console.error('处理流数据失败:', error)
      callbacks.onError('处理响应数据失败')
    }
    reader.releaseLock()
  }
} 