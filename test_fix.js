// 测试图片大小检查和处理逻辑
console.log('测试FAL图片处理修复...')

// 模拟base64图片数据
const smallBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77yQAAAABJRU5ErkJggg=='

// 模拟大图片base64（重复数据以增加大小）
const largeBase64Content = 'A'.repeat(2 * 1024 * 1024) // 2MB of A's
const largeBase64 = `data:image/png;base64,${btoa(largeBase64Content)}`

// 测试文件大小计算
function getBase64Size(base64) {
  const arr = base64.split(',')
  const bstr = atob(arr[1])
  return bstr.length
}

const smallSize = getBase64Size(smallBase64)
const largeSize = getBase64Size(largeBase64)

console.log(`小图片大小: ${(smallSize / 1024 / 1024).toFixed(2)}MB`)
console.log(`大图片大小: ${(largeSize / 1024 / 1024).toFixed(2)}MB`)

const FILE_SIZE_THRESHOLD = 1.5 * 1024 * 1024

console.log(`阈值: ${(FILE_SIZE_THRESHOLD / 1024 / 1024).toFixed(2)}MB`)
console.log(`小图片需要上传到FAL存储: ${smallSize > FILE_SIZE_THRESHOLD}`)
console.log(`大图片需要上传到FAL存储: ${largeSize > FILE_SIZE_THRESHOLD}`)

console.log('\n修复逻辑验证:')
console.log('- 小于1.5MB的图片将使用base64直接传递')
console.log('- 大于1.5MB的图片将上传到FAL存储并使用URL')
console.log('- 这样可以避免413 Request Entity Too Large错误')