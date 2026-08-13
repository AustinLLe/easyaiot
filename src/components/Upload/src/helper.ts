export function checkFileType(file: File, accepts: string[]) {
  const newTypes = accepts.join('|')
  // const reg = /\.(jpg|jpeg|png|gif|txt|doc|docx|xls|xlsx|xml)$/i;
  const reg = new RegExp(`\\.(${newTypes})$`, 'i')

  return reg.test(file.name)
}

export function checkImgType(file: File) {
  return isImgTypeByName(file.name)
}

export function isImgTypeByName(name: string) {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(name)
}

export function calculateUploadProgress(loaded: number, total: number) {
  if (!Number.isFinite(loaded) || !Number.isFinite(total) || total <= 0)
    return 0

  return Math.trunc((loaded / total) * 100)
}

export function getBase64WithFile(file: File) {
  return new Promise<{
    result: string
    file: File
  }>((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve({ result: reader.result as string, file })
    reader.onerror = error => reject(error instanceof Error ? error : new Error('Failed to read file'))
  },
  )
}
