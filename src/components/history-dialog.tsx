"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { storage } from "@/lib/storage"
import { useState, useEffect } from "react"
import { GeneratedImage } from "@/types"
import Image from "next/image"
import { Download, Trash2, Edit } from "lucide-react"
import { Button } from "./ui/button"

interface HistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onEditImage: (imageUrl: string) => void
}

export function HistoryDialog({ open, onOpenChange, onEditImage }: HistoryDialogProps) {
  const [history, setHistory] = useState<GeneratedImage[]>([])
  const [showContentDialog, setShowContentDialog] = useState(false)
  const [selectedContent, setSelectedContent] = useState<GeneratedImage | null>(null)

  const isVideoUrl = (url: string) => {
    return url.includes('.mp4') || url.includes('.webm') || url.includes('.mov') || url.startsWith('data:video')
  }

  useEffect(() => {
    if (open) {
      setHistory(storage.getHistory())
    }
  }, [open])

  const handleDelete = (id: string) => {
    storage.removeFromHistory(id)
    setHistory(storage.getHistory())
  }

  const handleDownload = async (url: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      
      // 根据内容类型设置文件名
      if (isVideoUrl(url)) {
        link.download = `history-video-${Date.now()}.mp4`
      } else {
        link.download = `history-image-${Date.now()}.png`
      }
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error('下载失败:', error)
    }
  }

  const handleEdit = (item: GeneratedImage) => {
    onEditImage(item.url)
    onOpenChange(false)
  }

  const handleShowContent = (item: GeneratedImage) => {
    console.log('handleShowContent called with:', item.id)
    setSelectedContent(item)
    setShowContentDialog(true)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>生成历史</DialogTitle>
        </DialogHeader>
        {history.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            暂无生成记录
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
            {history.map((item) => (
              <div key={item.id} className="relative group">
                <div 
                  className="aspect-square relative overflow-hidden rounded-lg cursor-pointer"
                  onDoubleClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('Double clicked item:', item.id)
                    handleShowContent(item)
                  }}
                  onClick={(e) => {
                    console.log('Single clicked item:', item.id)
                  }}
                >
                  {isVideoUrl(item.url) ? (
                    <video
                      src={item.url}
                      className="w-full h-full object-cover"
                      muted
                      loop
                      onMouseEnter={(e) => e.currentTarget.play()}
                      onMouseLeave={(e) => e.currentTarget.pause()}
                    />
                  ) : (
                    <Image
                      src={item.url}
                      alt={item.prompt}
                      fill
                      className="object-cover"
                    />
                  )}
                </div>
                <div 
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
                  style={{ pointerEvents: 'none' }}
                >
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-white hover:text-white hover:bg-white/20"
                    style={{ pointerEvents: 'auto' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDownload(item.url)
                    }}
                  >
                    <Download className="h-5 w-5" />
                  </Button>
                  {!isVideoUrl(item.url) && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-white hover:text-white hover:bg-white/20"
                      style={{ pointerEvents: 'auto' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(item)
                      }}
                    >
                      <Edit className="h-5 w-5" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-white hover:text-white hover:bg-white/20"
                    style={{ pointerEvents: 'auto' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(item.id)
                    }}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-white hover:text-white hover:bg-white/20"
                    style={{ pointerEvents: 'auto' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleShowContent(item)
                    }}
                    title="查看详情"
                  >
                    <span className="text-xs">详情</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
    
    {/* 内容展示弹窗 */}
    <Dialog open={showContentDialog} onOpenChange={setShowContentDialog}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {selectedContent && isVideoUrl(selectedContent.url) ? "视频详情" : "图片详情"}
          </DialogTitle>
        </DialogHeader>
        {selectedContent && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto">
            {/* 左侧：内容展示 */}
            <div className="flex items-center justify-center">
              {isVideoUrl(selectedContent.url) ? (
                <div className="w-full aspect-video">
                  <video
                    src={selectedContent.url}
                    controls
                    autoPlay
                    className="w-full h-full rounded-lg"
                  />
                </div>
              ) : (
                <div className="w-full aspect-square max-w-lg">
                  <Image
                    src={selectedContent.url}
                    alt={selectedContent.prompt}
                    fill
                    className="object-contain rounded-lg"
                  />
                </div>
              )}
            </div>
            
            {/* 右侧：详细信息 */}
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  提示词
                </h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 text-sm leading-relaxed">{selectedContent.prompt}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  生成信息
                </h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-sm">模型:</span>
                    <span className="text-gray-900 text-sm font-medium">{selectedContent.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-sm">生成时间:</span>
                    <span className="text-gray-900 text-sm">{new Date(selectedContent.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-sm">内容类型:</span>
                    <span className="text-gray-900 text-sm">{isVideoUrl(selectedContent.url) ? '视频' : '图片'}</span>
                  </div>
                  {selectedContent.aspectRatio && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-sm">图片比例:</span>
                      <span className="text-gray-900 text-sm">{selectedContent.aspectRatio}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  操作
                </h4>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(selectedContent.url)}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    下载
                  </Button>
                  {!isVideoUrl(selectedContent.url) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleEdit(selectedContent)
                        setShowContentDialog(false)
                      }}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      编辑
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  )
} 