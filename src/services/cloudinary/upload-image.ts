import { uploadImagemCloudinary } from './cloudinary.service.js'

export async function uploadImage(filePath: string) {
  const secure_url = await uploadImagemCloudinary(filePath)

  return secure_url
}
