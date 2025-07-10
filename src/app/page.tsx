"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Info, Download, Edit, Settings, History, Image as ImageIcon, MessageSquare, Upload, ChevronLeft, ChevronRight, Maximize2, Github } from "lucide-react"
import Image from "next/image"
import { ApiKeyDialog } from "@/components/api-key-dialog"
import { HistoryDialog } from "@/components/history-dialog"
import { useState, useRef, useEffect, Suspense } from "react"
import { api } from "@/lib/api"
import { GenerationModel, AspectRatio, ImageSize, DalleImageData, ModelType, CustomModel, ModelTag } from "@/types"
import { storage } from "@/lib/storage"
import { v4 as uuidv4 } from 'uuid'
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { MaskEditor } from "@/components/mask-editor"
import { useSearchParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { CustomModelDialog } from "@/components/custom-model-dialog"
import { toast } from "sonner"

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  )
}

function HomeContent() {
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [customModels, setCustomModels] = useState<CustomModel[]>([])
  const [showCustomModelDialog, setShowCustomModelDialog] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [model, setModel] = useState<GenerationModel>("fal-flux-pro")
  const [modelType, setModelType] = useState<ModelType>(ModelType.FAL)

  // 获取标签显示文本
  const getTagDisplayText = (tag?: ModelTag): string => {
    if (!tag) return ''
    switch (tag) {
      case ModelTag.TEXT_TO_IMAGE:
        return '文生图'
      case ModelTag.IMAGE_TO_IMAGE:
        return '图生图'
      case ModelTag.TEXT_TO_VIDEO:
        return '文生视频'
      case ModelTag.IMAGE_TO_VIDEO:
        return '图生视频'
      default:
        return ''
    }
  }

  // 根据当前模型标签判断是否需要图片输入
  const shouldShowImageUpload = (): boolean => {
    const currentModel = customModels.find(m => m.value === model)
    if (!currentModel || !currentModel.tag) return false
    return currentModel.tag === ModelTag.IMAGE_TO_IMAGE || currentModel.tag === ModelTag.IMAGE_TO_VIDEO
  }

  // 根据当前模型标签判断是否为视频模型
  const isVideoModel = (): boolean => {
    const currentModel = customModels.find(m => m.value === model)
    if (!currentModel || !currentModel.tag) return false
    return currentModel.tag === ModelTag.TEXT_TO_VIDEO || currentModel.tag === ModelTag.IMAGE_TO_VIDEO
  }

  // 获取当前模式描述
  const getCurrentModeDescription = (): string => {
    const currentModel = customModels.find(m => m.value === model)
    if (!currentModel || !currentModel.tag) return '请选择模型'
    return getTagDisplayText(currentModel.tag)
  }
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showImageDialog, setShowImageDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [streamContent, setStreamContent] = useState<string>("")
  const [isImageToImage, setIsImageToImage] = useState(false)
  const [sourceImages, setSourceImages] = useState<string[]>([])
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("original")
  const [size, setSize] = useState<ImageSize>("1024x1024")
  const [n, setN] = useState(1)
  const [quality, setQuality] = useState<'auto' | 'high' | 'medium' | 'low' | 'hd' | 'standard'>('auto')
  const [enableSafetyChecker, setEnableSafetyChecker] = useState(true)
  const [safetyTolerance, setSafetyTolerance] = useState<'1' | '2' | '3' | '4' | '5' | '6'>('2')
  const [duration, setDuration] = useState<'5' | '10'>('5')
  const contentRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showMaskEditor, setShowMaskEditor] = useState(false)
  const [maskImage, setMaskImage] = useState<string | null>(null)
  const [isMaskEditorOpen, setIsMaskEditorOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    const url = searchParams.get('url')
    const apiKey = searchParams.get('apikey')
    
    if (url && apiKey) {
      // 解码 URL 参数
      const decodedUrl = decodeURIComponent(url)
      const decodedApiKey = decodeURIComponent(apiKey)
      storage.setApiConfig(decodedApiKey, decodedUrl)
    }

    // 检查并修复存储的API URL，确保使用HTTPS
    const storedConfig = storage.getApiConfig()
    if (storedConfig && storedConfig.baseUrl && storedConfig.baseUrl.startsWith('http:')) {
      const secureUrl = storedConfig.baseUrl.replace('http:', 'https:')
      storage.setApiConfig(storedConfig.key, secureUrl)
      console.log('API URL已自动升级到HTTPS:', secureUrl)
    }

    // 加载自定义模型并设置默认模型
    const models = storage.getCustomModels()
    setCustomModels(models)
    
    // 选择第一个可用模型作为默认模型
    if (models.length > 0) {
      const firstModel = models[0]
      setModel(firstModel.value)
      setModelType(firstModel.type)
    }
  }, [searchParams])

  // 监听自定义模型对话框关闭，重新加载模型
  useEffect(() => {
    if (!showCustomModelDialog) {
      const models = storage.getCustomModels()
      setCustomModels(models)
      
      // 如果当前没有选择模型，或者选择的模型不存在，选择第一个可用模型
      if (!model || !models.find(m => m.value === model)) {
        const firstModel = models[0]
        if (firstModel) {
          setModel(firstModel.value)
          setModelType(firstModel.type)
        }
      }
    }
  }, [showCustomModelDialog, model])

  // 自动根据模型标签切换生成模式
  useEffect(() => {
    const isImageMode = shouldShowImageUpload()
    setIsImageToImage(isImageMode)
    // 当模式切换时，自动设置合适的默认比例
    if (isImageMode && aspectRatio === "1:1") {
      setAspectRatio("original")
    } else if (!isImageMode && aspectRatio === "original") {
      setAspectRatio("1:1")
    }
  }, [model, customModels, aspectRatio])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        if (file.size > 4 * 1024 * 1024) {
          setError("图片大小不能超过4MB")
          return
        }

        // 检查文件类型
        if (!['image/jpeg', 'image/png'].includes(file.type)) {
          setError("只支持JPG和PNG格式的图片")
          return
        }

        const reader = new FileReader()
        reader.onload = (e) => {
          const base64 = e.target?.result as string
          setSourceImages(prev => [...prev, base64])
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const handleRemoveImage = (index: number) => {
    setSourceImages(prev => prev.filter((_, i) => i !== index))
    // 重置文件输入框的值，确保相同的文件可以再次上传
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const isBase64Image = (url: string) => {
    return url.startsWith('data:image');
  }

  const isVideoUrl = (url: string) => {
    return url.includes('.mp4') || url.includes('.webm') || url.includes('.mov') || url.startsWith('data:video')
  }

  const handleSelectCustomModel = (modelValue: string, type: ModelType) => {
    setModel(modelValue)
    setModelType(type)
    setCustomModels(storage.getCustomModels()) // 刷新自定义模型列表
    toast.success("已选择自定义模型")
  }

  const handleGenerate = async () => {
    if (shouldShowImageUpload() && sourceImages.length === 0) {
      setError("请先上传或选择图片")
      return
    }
    if (!prompt.trim()) {
      setError("请输入提示词")
      return
    }

    setError(null)
    setIsGenerating(true)
    setGeneratedImages([])
    setStreamContent("")
    setCurrentImageIndex(0)

    try {
      // 如果有多张源图片，将它们的信息添加到提示词中
      let enhancedPrompt = prompt.trim();
      if (sourceImages.length > 1) {
        enhancedPrompt += `\n\n参考图片信息：上传了${sourceImages.length}张参考图片，第一张作为主要参考，其他图片作为额外参考。`;
      }
      
      const finalPrompt = enhancedPrompt
      
      try {
        let response;
        
        if (modelType === ModelType.FAL) {
          // FAL 模型生成
          response = await api.generateFalImage({
            prompt: finalPrompt,
            model,
            modelType,
            sourceImages: shouldShowImageUpload() ? sourceImages : undefined,
            aspectRatio,
            n,
            enableSafetyChecker,
            safetyTolerance,
            duration: isVideoModel() ? duration : undefined
          })
          
          setGeneratedImages([response.imageUrl])
        } else if (modelType === ModelType.OPENAI) {
          // OpenAI 模型生成（流式）
          if (shouldShowImageUpload()) {
            // 图生图，使用编辑功能
            if (maskImage) {
              const editResponse = await api.editDalleImage({
                prompt: finalPrompt,
                model,
                modelType,
                sourceImage: sourceImages[0],
                mask: maskImage,
                size,
                n,
                quality
              })
              
              if (editResponse.data && editResponse.data.length > 0) {
                const imageUrls = editResponse.data.map(img => img.url).filter(Boolean) as string[]
                setGeneratedImages(imageUrls)
              }
            } else {
              // 使用流式生成
              await api.generateStreamImage({
                prompt: finalPrompt,
                model,
                modelType,
                isImageToImage: shouldShowImageUpload(),
                sourceImages,
                aspectRatio,
                size,
                n,
                quality
              }, {
                onMessage: (content) => {
                  setStreamContent(prev => prev + content)
                },
                onComplete: (imageUrl) => {
                  setGeneratedImages([imageUrl])
                  setStreamContent("")
                },
                onError: (error) => {
                  setError(error)
                }
              })
            }
          } else {
            // 文生图，使用流式生成
            await api.generateStreamImage({
              prompt: finalPrompt,
              model,
              modelType,
              isImageToImage: false,
              aspectRatio,
              size,
              n,
              quality
            }, {
              onMessage: (content) => {
                setStreamContent(prev => prev + content)
              },
              onComplete: (imageUrl) => {
                setGeneratedImages([imageUrl])
                setStreamContent("")
              },
              onError: (error) => {
                setError(error)
              }
            })
          }
        }
        
        // 添加到历史记录
        if (modelType === ModelType.FAL && response?.imageUrl) {
          storage.addToHistory({
            id: uuidv4(),
            prompt: finalPrompt,
            url: response.imageUrl,
            model,
            createdAt: new Date().toISOString(),
            aspectRatio
          })
        } else if (modelType === ModelType.OPENAI && generatedImages.length > 0) {
          storage.addToHistory({
            id: uuidv4(),
            prompt: finalPrompt,
            url: generatedImages[0],
            model,
            createdAt: new Date().toISOString(),
            aspectRatio
          })
        }
        
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError('生成图片失败，请重试')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败，请重试")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleReset = () => {
    setPrompt("")
    setGeneratedImages([])
    setError(null)
    setStreamContent("")
    setSourceImages([])
    setMaskImage(null)
    setAspectRatio(shouldShowImageUpload() ? "original" : "1:1")
    setSize("1024x1024")
    setN(1)
    setEnableSafetyChecker(true)
    setSafetyTolerance("2")
    setDuration("5")
    setCurrentImageIndex(0)
  }

  const handlePrevImage = () => {
    setCurrentImageIndex(prev => (prev - 1 + generatedImages.length) % generatedImages.length)
  }

  const handleNextImage = () => {
    setCurrentImageIndex(prev => (prev + 1) % generatedImages.length)
  }

  const handleEditCurrentImage = () => {
    if (generatedImages[currentImageIndex]) {
      setSourceImages([generatedImages[currentImageIndex]])
    }
  }

  const handleDownload = () => {
    if (generatedImages[currentImageIndex]) {
      const imageUrl = generatedImages[currentImageIndex];
      const link = document.createElement('a');
      link.href = imageUrl;
      
      // 根据内容类型设置文件名
      if (isVideoUrl(imageUrl)) {
        link.download = `generated-video-${Date.now()}.mp4`;
      } else if (isBase64Image(imageUrl)) {
        link.download = `generated-image-${Date.now()}.png`;
      } else {
        link.download = 'generated-content';
      }
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      {/* 顶部提示栏 */}
      <div className="w-full bg-blue-50 p-4 relative">
        <div className="container mx-auto flex justify-center text-sm text-blue-700">
          <Info className="h-4 w-4 mr-2" />
          <p>数据安全提示：所有生成的图片和历史记录仅保存在本地浏览器中。请及时下载并备份重要图片。使用隐私模式或更换设备会导致数据丢失无法恢复。</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full p-2"
          onClick={() => window.open('https://github.com/HappyDongD/magic_image', '_blank')}
        >
          <Github className="h-5 w-5" />
        </Button>
      </div>

      {/* 标题区域 */}
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold">魔法AI绘画</h1>
        <p className="text-gray-500 mt-2">通过简单的文字描述，创造精美的AI艺术作品</p>
      </div>

      <div className="container mx-auto px-4 pb-8 max-w-[1400px]">
        <div className="grid grid-cols-[1fr_2fr] gap-6">
          {/* 左侧控制面板 */}
          <div className="space-y-6">
            <Card className="sticky top-4 z-10">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowApiKeyDialog(true)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    密钥设置
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowHistoryDialog(true)}
                  >
                    <History className="h-4 w-4 mr-2" />
                    历史记录
                  </Button>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium">当前模式</h3>
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center gap-2">
                      {shouldShowImageUpload() ? (
                        <ImageIcon className="h-4 w-4 text-blue-500" />
                      ) : (
                        <MessageSquare className="h-4 w-4 text-green-500" />
                      )}
                      <span className="font-medium">{getCurrentModeDescription()}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {shouldShowImageUpload() 
                        ? "需要上传图片作为输入" 
                        : "基于文字描述生成内容"}
                    </p>
                  </div>
                </div>

                {shouldShowImageUpload() && (
                  <div className="space-y-2">
                    <h3 className="font-medium">上传图片进行编辑</h3>
                    <div 
                      className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {sourceImages.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                          {sourceImages.map((image, index) => (
                            <div key={index} className="relative aspect-square w-full">
                              <Image
                                src={image}
                                alt={`Source ${index + 1}`}
                                fill
                                className="object-contain rounded-lg"
                              />
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveImage(index);
                                }}
                              >
                                ✕
                              </Button>
                            </div>
                          ))}
                          {sourceImages.length < 4 && (
                            <div className="flex items-center justify-center aspect-square w-full border-2 border-dashed rounded-lg">
                              <Upload className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-gray-500">
                          <Upload className="h-8 w-8" />
                          <p>点击上传图片或拖拽图片到这里</p>
                          <p className="text-xs">仅支持JPG、PNG格式，最大4MB</p>
                          <p className="text-xs text-blue-500">可上传多张图片作为参考（最多4张）</p>
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png"
                      className="hidden"
                      onChange={handleFileUpload}
                      multiple
                    />
                  </div>
                )}

                {shouldShowImageUpload() && sourceImages.length > 0 && (model === 'gpt-image-1' || modelType === ModelType.OPENAI) && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setIsMaskEditorOpen(true)
                      setSelectedImage(sourceImages[0])
                    }}
                  >
                    {maskImage ? "重新编辑区域" : "编辑图片区域"}
                  </Button>
                )}

                <div className="space-y-2">
                  <h3 className="font-medium">提示词</h3>
                  <Textarea 
                    placeholder="描述你想要生成的图像，例如：一只可爱的猫咪，柔软的毛发，大眼睛，阳光下微笑..."
                    className="min-h-[120px]"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium">模型选择</h3>
                  <div className="flex gap-2 mb-2">
                    <Select 
                      value={model} 
                      onValueChange={(value: GenerationModel) => {
                        setModel(value)
                        // 根据选择的模型设置模型类型
                        const customModel = customModels.find(m => m.value === value)
                        if (customModel) {
                          setModelType(customModel.type)
                        } else {
                          setModelType(ModelType.FAL) // 默认为FAL类型
                        }
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="选择生成模型" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* 显示默认模型 */}
                        {customModels.filter(m => m.isDefault).map(model => (
                          <SelectItem key={model.id} value={model.value}>
                            <div className="flex items-center justify-between w-full">
                              <span>{model.name}</span>
                              {model.type === ModelType.FAL && model.tag && (
                                <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full ml-2">
                                  {getTagDisplayText(model.tag)}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                        
                        {/* 显示FAL自定义模型 */}
                        {customModels.filter(m => m.type === ModelType.FAL && !m.isDefault).length > 0 && (
                          <>
                            <SelectItem value="divider-fal" disabled>
                              ──── FAL 自定义模型 ────
                            </SelectItem>
                            {customModels.filter(m => m.type === ModelType.FAL && !m.isDefault).map(customModel => (
                              <SelectItem 
                                key={customModel.id} 
                                value={customModel.value}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span>{customModel.name}</span>
                                  {customModel.tag && (
                                    <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full ml-2">
                                      {getTagDisplayText(customModel.tag)}
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </>
                        )}
                        
                        {/* 显示OpenAI自定义模型 */}
                        {customModels.filter(m => m.type === ModelType.OPENAI && !m.isDefault).length > 0 && (
                          <>
                            <SelectItem value="divider-openai" disabled>
                              ──── OpenAI 自定义模型 ────
                            </SelectItem>
                            {customModels.filter(m => m.type === ModelType.OPENAI && !m.isDefault).map(customModel => (
                              <SelectItem 
                                key={customModel.id} 
                                value={customModel.value}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span>{customModel.name}</span>
                                  {/* OpenAI模型不显示标签 */}
                                </div>
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowCustomModelDialog(true)}
                      title="管理自定义模型"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">模型类型: {modelType === ModelType.FAL ? 'FAL格式' : 'OpenAI格式'}</p>
                  <p className="text-xs text-gray-500">选择不同的AI模型可能会产生不同风格的图像结果</p>
                </div>
              </CardContent>
            </Card>

            {/* 图片配置 */}
            {model && customModels.find(m => m.value === model) && (
              <Card className="sticky top-2 z-20">
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-medium">图片配置</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">图片比例</h4>
                      <Select value={aspectRatio} onValueChange={(value: AspectRatio) => setAspectRatio(value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择图片比例" />
                        </SelectTrigger>
                        <SelectContent>
                          {shouldShowImageUpload() && (
                            <SelectItem value="original">原始比例</SelectItem>
                          )}
                          <SelectItem value="1:1">1:1 方形</SelectItem>
                          <SelectItem value="16:9">16:9 宽屏</SelectItem>
                          <SelectItem value="9:16">9:16 竖屏</SelectItem>
                          <SelectItem value="2:3">2:3 竖向</SelectItem>
                          <SelectItem value="3:2">3:2 横向</SelectItem>
                          <SelectItem value="4:5">4:5 竖向</SelectItem>
                          <SelectItem value="5:4">5:4 横向</SelectItem>
                          <SelectItem value="3:4">3:4 竖向</SelectItem>
                          <SelectItem value="4:3">4:3 横向</SelectItem>
                          <SelectItem value="21:9">21:9 超宽屏</SelectItem>
                          <SelectItem value="9:21">9:21 超竖屏</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">生成数量</h4>
                    <Select value={n.toString()} onValueChange={(value) => setN(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择生成数量" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1张</SelectItem>
                        <SelectItem value="2">2张</SelectItem>
                        <SelectItem value="3">3张</SelectItem>
                        <SelectItem value="4">4张</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">安全检查器</h4>
                    <Select value={enableSafetyChecker.toString()} onValueChange={(value) => setEnableSafetyChecker(value === 'true')}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择是否启用安全检查" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">启用</SelectItem>
                        <SelectItem value="false">禁用</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {isVideoModel() ? (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">视频时长</h4>
                      <Select value={duration} onValueChange={(value: '5' | '10') => setDuration(value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择视频时长" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5秒</SelectItem>
                          <SelectItem value="10">10秒</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">安全容错级别</h4>
                      <Select value={safetyTolerance} onValueChange={(value: '1' | '2' | '3' | '4' | '5' | '6') => setSafetyTolerance(value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择安全容错级别" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 - 最严格</SelectItem>
                          <SelectItem value="2">2 - 严格</SelectItem>
                          <SelectItem value="3">3 - 中等</SelectItem>
                          <SelectItem value="4">4 - 宽松</SelectItem>
                          <SelectItem value="5">5 - 很宽松</SelectItem>
                          <SelectItem value="6">6 - 最宽松</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-2">
                  <Button 
                    className="w-full" 
                    onClick={handleGenerate}
                    disabled={isGenerating}
                  >
                    {isGenerating ? "生成中..." : 
                     isVideoModel() ? "生成视频" :
                     shouldShowImageUpload() ? "编辑图片" : "生成图片"}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleReset}
                  >
                    重置
                  </Button>
                </div>
              </CardContent>
            </Card>
            )}
          </div>

          {/* 右侧内容区 */}
          <Card className="min-h-[calc(100vh-13rem)]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">生成结果</h2>
                {generatedImages.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button 
                      size="icon" 
                      variant="ghost"
                      onClick={handleDownload}
                    >
                      <Download className="h-5 w-5" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost"
                      onClick={() => {
                        setSourceImages([generatedImages[currentImageIndex]])
                      }}
                    >
                      <Edit className="h-5 w-5" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col items-stretch justify-start p-6 h-full">
              {error ? (
                <div className="text-center text-red-500 whitespace-pre-line">
                  <p>{error}</p>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col gap-4">
                  {isGenerating ? (
                    <div className="text-center text-gray-400">
                      {modelType === ModelType.FAL 
                        ? (isVideoModel() ? "正在生成视频中，请耐心等待..." : "正在生成图片中...") 
                        : "正在生成中..."}
                    </div>
                  ) : (
                    <div className="text-center text-gray-400">
                      {generatedImages.length === 0 ? "等待生成..." : null}
                    </div>
                  )}
                  
                  {/* 显示流式内容（仅用于 OpenAI 模型） */}
                  {modelType === ModelType.OPENAI && streamContent && (
                    <div className="text-sm text-gray-600 whitespace-pre-line">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                      >
                        {streamContent}
                      </ReactMarkdown>
                    </div>
                  )}
                  
                  {generatedImages.length > 0 && (
                    <div className="relative w-full aspect-square max-w-2xl mx-auto">
                      {isVideoUrl(generatedImages[currentImageIndex]) ? (
                        <video
                          src={generatedImages[currentImageIndex]}
                          controls
                          className="w-full h-full object-contain rounded-lg"
                          style={{ maxHeight: '100%', maxWidth: '100%' }}
                        />
                      ) : (
                        <Image
                          src={generatedImages[currentImageIndex]}
                          alt={prompt}
                          fill
                          className="object-contain rounded-lg"
                        />
                      )}
                      {generatedImages.length > 1 && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/50 hover:bg-white/80"
                            onClick={handlePrevImage}
                          >
                            <ChevronLeft className="h-6 w-6" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/50 hover:bg-white/80"
                            onClick={handleNextImage}
                          >
                            <ChevronRight className="h-6 w-6" />
                          </Button>
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/50 px-2 py-1 rounded-full text-sm">
                            {currentImageIndex + 1} / {generatedImages.length}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ApiKeyDialog 
        open={showApiKeyDialog} 
        onOpenChange={setShowApiKeyDialog} 
      />
      <HistoryDialog 
        open={showHistoryDialog} 
        onOpenChange={setShowHistoryDialog}
        onEditImage={(imageUrl) => {
          setSourceImages([imageUrl])
          
          // 寻找第一个图生图模型
          const imageToImageModel = customModels.find(m => 
            m.tag === ModelTag.IMAGE_TO_IMAGE
          )
          
          if (imageToImageModel) {
            setModel(imageToImageModel.value)
            setModelType(imageToImageModel.type)
          }
        }}
      />
      <CustomModelDialog
        open={showCustomModelDialog}
        onOpenChange={setShowCustomModelDialog}
        onSelectModel={handleSelectCustomModel}
      />

      <footer className="w-full py-4 text-center text-sm text-gray-500">
        <a 
          href="https://github.com/HappyDongD/magic_image" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-primary transition-colors inline-flex items-center gap-2"
        >
          <Github className="h-4 w-4" />
          访问 GitHub 项目主页
        </a>
      </footer>

      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-4xl">
          <div className="relative w-full aspect-square">
            {generatedImages.length > 0 && isVideoUrl(generatedImages[currentImageIndex]) ? (
              <video
                src={generatedImages[currentImageIndex]}
                controls
                className="w-full h-full object-contain rounded-lg"
                style={{ maxHeight: '100%', maxWidth: '100%' }}
              />
            ) : (
              <Image
                src={generatedImages[currentImageIndex]}
                alt={prompt}
                fill
                className="object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {isMaskEditorOpen && selectedImage ? (
        <MaskEditor
          imageUrl={selectedImage}
          onMaskChange={(maskDataUrl) => {
            setMaskImage(maskDataUrl)
            setIsMaskEditorOpen(false)
          }}
          onClose={() => setIsMaskEditorOpen(false)}
          initialMask={maskImage || undefined}
        />
      ) : null}
    </main>
  )
}
