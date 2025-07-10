import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { storage } from "@/lib/storage"
import { Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

interface ApiKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DEFAULT_API_KEY = "efcd5ad0-f538-4898-9bb5-7b6586071e8a:a656dd5786e8413f1f008f4a0851df20"

export function ApiKeyDialog({ open, onOpenChange }: ApiKeyDialogProps) {
  const [key, setKey] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [errors, setErrors] = useState<{ key?: string }>({})
  const [isUsingDefault, setIsUsingDefault] = useState(false)

  useEffect(() => {
    const config = storage.getApiConfig()
    if (config) {
      // 如果存储的密钥是默认密钥，则不显示
      if (config.key === DEFAULT_API_KEY) {
        setKey("")
        setIsUsingDefault(true)
      } else {
        setKey(config.key)
        setIsUsingDefault(false)
      }
    } else {
      // 首次使用，设置默认密钥
      storage.setApiConfig(DEFAULT_API_KEY, "")
      setIsUsingDefault(true)
    }
  }, [open])

  const validateInputs = () => {
    const newErrors: { key?: string } = {}
    if (!key.trim() && !isUsingDefault) {
      newErrors.key = "请输入 API Key 或使用默认设置"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (!validateInputs()) return
    
    const finalKey = key.trim() || DEFAULT_API_KEY
    storage.setApiConfig(finalKey, "")
    
    if (key.trim()) {
      setIsUsingDefault(false)
      toast.success("自定义 API Key 保存成功")
    } else {
      setIsUsingDefault(true)
      toast.success("已使用默认 API Key")
    }
    
    onOpenChange(false)
  }

  const handleUseDefault = () => {
    setKey("")
    setIsUsingDefault(true)
    setErrors({})
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>FAL API 密钥设置</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="space-y-2">
              {isUsingDefault && !key.trim() && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-700">
                    ✓ 当前使用默认 API Key，可直接开始使用
                  </p>
                </div>
              )}
              
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  placeholder="输入自定义 FAL API Key（可选）"
                  value={key}
                  onChange={(e) => {
                    setKey(e.target.value)
                    setIsUsingDefault(false)
                    setErrors(prev => ({ ...prev, key: undefined }))
                  }}
                  className={`pr-10 ${errors.key ? "border-red-500" : ""}`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                {errors.key && (
                  <p className="text-sm text-red-500 mt-1">{errors.key}</p>
                )}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleUseDefault}
                className="w-full"
              >
                使用默认 API Key
              </Button>
            </div>
            
            <p className="text-xs text-gray-500">
              API Key 将安全地存储在您的浏览器中，不会上传到服务器
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>保存</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 