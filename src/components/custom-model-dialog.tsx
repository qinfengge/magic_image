import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"
import { storage } from "@/lib/storage"
import { CustomModel, ModelType, ModelTag } from "@/types"
import { toast } from "sonner"
import { v4 as uuidv4 } from "uuid"
import { Trash2, Plus, Edit } from "lucide-react"

interface CustomModelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectModel?: (model: string, type: ModelType) => void
}

export function CustomModelDialog({ open, onOpenChange, onSelectModel }: CustomModelDialogProps) {
  const [models, setModels] = useState<CustomModel[]>([])
  const [modelName, setModelName] = useState("")
  const [modelValue, setModelValue] = useState("")
  const [modelType, setModelType] = useState<ModelType>(ModelType.FAL)
  const [modelTag, setModelTag] = useState<ModelTag>(ModelTag.TEXT_TO_IMAGE)
  const [editingModelId, setEditingModelId] = useState<string | null>(null)

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

  useEffect(() => {
    if (open) {
      const savedModels = storage.getCustomModels()
      setModels(savedModels)
    }
  }, [open])

  const resetForm = () => {
    setModelName("")
    setModelValue("")
    setModelType(ModelType.FAL)
    setModelTag(ModelTag.TEXT_TO_IMAGE)
    setEditingModelId(null)
  }

  const handleAddModel = () => {
    if (!modelName.trim() || !modelValue.trim()) {
      toast.error("模型名称和值不能为空")
      return
    }

    // 检查是否已存在相同的模型值，防止重复添加
    const modelExists = models.some(model => 
      model.id !== editingModelId && (
        model.value.toLowerCase() === modelValue.trim().toLowerCase() || 
        model.name.toLowerCase() === modelName.trim().toLowerCase()
      )
    )

    if (modelExists) {
      toast.error("已存在相同名称或相同值的模型，请使用不同的名称或值")
      return
    }

    const newModel: CustomModel = {
      id: editingModelId || uuidv4(),
      name: modelName.trim(),
      value: modelValue.trim(),
      type: modelType,
      ...(modelType === ModelType.FAL && { tag: modelTag }), // 只有FAL格式才有标签
      createdAt: new Date().toISOString()
    }

    if (editingModelId) {
      // 更新现有模型
      storage.updateCustomModel(editingModelId, newModel)
      setModels(prev => prev.map(model => model.id === editingModelId ? newModel : model))
      toast.success("模型已更新")
    } else {
      // 添加新模型
      storage.addCustomModel(newModel)
      setModels(prev => [...prev, newModel])
      toast.success("模型已添加")
    }

    resetForm()
  }

  const handleEditModel = (model: CustomModel) => {
    setModelName(model.name)
    setModelValue(model.value)
    setModelType(model.type)
    setModelTag(model.tag || ModelTag.TEXT_TO_IMAGE) // 如果没有标签，默认为文生图
    setEditingModelId(model.id)
  }

  const handleDeleteModel = (id: string) => {
    storage.removeCustomModel(id)
    setModels(prev => prev.filter(model => model.id !== id))
    toast.success("模型已删除")
  }

  const handleSelectModel = (model: CustomModel) => {
    if (onSelectModel) {
      onSelectModel(model.value, model.type)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>自定义模型管理</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">添加/编辑模型</h3>
            <div className="grid gap-3">
              <div>
                <Input
                  placeholder="模型名称（显示在界面上）"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                />
              </div>
              <div>
                <Input
                  placeholder="模型值（实际API使用的值）"
                  value={modelValue}
                  onChange={(e) => setModelValue(e.target.value)}
                />
              </div>
              <div>
                <Select value={modelType} onValueChange={(value: ModelType) => setModelType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择模型类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ModelType.OPENAI}>OpenAI 格式</SelectItem>
                    <SelectItem value={ModelType.FAL}>FAL 格式</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  OpenAI格式：使用聊天接口 | FAL格式：使用FAL AI接口
                </p>
              </div>
              {/* 只有FAL格式才显示标签选择 */}
              {modelType === ModelType.FAL && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">模型标签</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div 
                      className={`relative cursor-pointer rounded-lg border-2 p-3 transition-all ${
                        modelTag === ModelTag.TEXT_TO_IMAGE 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setModelTag(ModelTag.TEXT_TO_IMAGE)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">文生图</span>
                        {modelTag === ModelTag.TEXT_TO_IMAGE && (
                          <div className="h-4 w-4 rounded-full bg-blue-500 text-white flex items-center justify-center">
                            <span className="text-xs">✓</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">根据文字描述生成图像</p>
                    </div>
                    
                    <div 
                      className={`relative cursor-pointer rounded-lg border-2 p-3 transition-all ${
                        modelTag === ModelTag.IMAGE_TO_IMAGE 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setModelTag(ModelTag.IMAGE_TO_IMAGE)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">图生图</span>
                        {modelTag === ModelTag.IMAGE_TO_IMAGE && (
                          <div className="h-4 w-4 rounded-full bg-blue-500 text-white flex items-center justify-center">
                            <span className="text-xs">✓</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">基于输入图像生成新图像</p>
                    </div>
                    
                    <div 
                      className={`relative cursor-pointer rounded-lg border-2 p-3 transition-all ${
                        modelTag === ModelTag.TEXT_TO_VIDEO 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setModelTag(ModelTag.TEXT_TO_VIDEO)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">文生视频</span>
                        {modelTag === ModelTag.TEXT_TO_VIDEO && (
                          <div className="h-4 w-4 rounded-full bg-blue-500 text-white flex items-center justify-center">
                            <span className="text-xs">✓</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">根据文字描述生成视频</p>
                    </div>
                    
                    <div 
                      className={`relative cursor-pointer rounded-lg border-2 p-3 transition-all ${
                        modelTag === ModelTag.IMAGE_TO_VIDEO 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setModelTag(ModelTag.IMAGE_TO_VIDEO)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">图生视频</span>
                        {modelTag === ModelTag.IMAGE_TO_VIDEO && (
                          <div className="h-4 w-4 rounded-full bg-blue-500 text-white flex items-center justify-center">
                            <span className="text-xs">✓</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">基于输入图像生成视频</p>
                    </div>
                  </div>
                </div>
              )}
              <Button onClick={handleAddModel}>
                {editingModelId ? '更新模型' : '添加模型'}
              </Button>
              {editingModelId && (
                <Button variant="ghost" onClick={resetForm}>
                  取消编辑
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">已保存的模型</h3>
            {models.length === 0 ? (
              <p className="text-sm text-gray-500">尚未添加自定义模型</p>
            ) : (
              <div className="space-y-2">
                {models.map((model) => (
                  <div key={model.id} className="border rounded-md p-3 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">{model.name}</p>
                        {model.isDefault && (
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            默认
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate mb-2">{model.value}</p>
                      <div className="flex gap-2 items-center">
                        <p className="text-xs text-gray-500">
                          类型: {model.type === ModelType.OPENAI ? 'OpenAI' : 'FAL'}
                        </p>
                        {/* 只有FAL格式的模型才显示标签 */}
                        {model.type === ModelType.FAL && model.tag && (
                          <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
                            {getTagDisplayText(model.tag)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost" onClick={() => handleSelectModel(model)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                      {!model.isDefault && (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => handleEditModel(model)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDeleteModel(model.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 