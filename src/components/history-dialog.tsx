"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { storage } from "@/lib/storage"
import { useState, useEffect } from "react"
import { GeneratedImage } from "@/types"
import Image from "next/image"
import { Download, Trash2, Edit, Play, Pause } from "lucide-react"
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
  const [isPlaying, setIsPlaying] = useState(false)
  const [videoDimensions, setVideoDimensions] = useState<{width: number, height: number} | null>(null)

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
    setIsPlaying(false)
    setVideoDimensions(null)
  }

  const handleVideoLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget
    setVideoDimensions({
      width: video.videoWidth,
      height: video.videoHeight
    })
  }

  const handlePlayPause = () => {
    const video = document.querySelector('#detail-video') as HTMLVideoElement
    if (video) {
      if (isPlaying) {
        video.pause()
      } else {
        video.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const getVideoAspectRatio = () => {
    if (!videoDimensions) return 'aspect-video'
    const isPortrait = videoDimensions.height > videoDimensions.width
    return isPortrait ? 'aspect-[9/16]' : 'aspect-video'
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
                  
                  {/* 类型标签 */}
                  <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
                    {isVideoUrl(item.url) ? '视频' : '图片'}
                  </div>
                </div>
                <div 
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
                  onDoubleClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleShowContent(item)
                  }}
                >
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-white hover:text-white hover:bg-white/20"
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
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(item.id)
                    }}
                  >
                    <Trash2 className="h-5 w-5" />
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
                <div className={`w-full max-w-2xl ${getVideoAspectRatio()}`}>
                  <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
                    <video
                      id="detail-video"
                      src={selectedContent.url}
                      className="w-full h-full object-contain"
                      onLoadedMetadata={handleVideoLoadedMetadata}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      muted={false}
                      playsInline
                    />
                    
                    {/* 自定义播放控件覆盖层 */}
                    {!isPlaying && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Button
                          size="lg"
                          className="w-16 h-16 rounded-full bg-white/90 hover:bg-white text-black hover:text-black shadow-lg"
                          onClick={handlePlayPause}
                        >
                          <Play className="h-8 w-8 ml-1" />
                        </Button>
                      </div>
                    )}
                    
                    {/* 暂停时的控件 */}
                    {isPlaying && (
                      <div 
                        className="absolute inset-0 cursor-pointer"
                        onClick={handlePlayPause}
                      >
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
                          <Button
                            size="lg"
                            className="w-12 h-12 rounded-full bg-white/80 hover:bg-white/90 text-black opacity-0 hover:opacity-100 transition-opacity"
                          >
                            <Pause className="h-6 w-6" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="w-full aspect-auto max-w-lg">
                  <div className="relative w-full h-auto">
                    <Image
                      src={selectedContent.url}
                      alt={selectedContent.prompt}
                      width={500}
                      height={500}
                      className="object-contain rounded-lg w-full h-auto"
                    />
                  </div>
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