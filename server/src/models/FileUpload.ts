import mongoose from 'mongoose'

export interface IFileUpload extends mongoose.Document {
  managerEmail: string
  fileType: 'observed' | 'planned'
  originalFilename: string
  recordCount: number
  uploadedAt: Date
  updatedAt: Date
}

const fileUploadSchema = new mongoose.Schema<IFileUpload>(
  {
    managerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    fileType: {
      type: String,
      enum: ['observed', 'planned'],
      required: true,
    },
    originalFilename: {
      type: String,
      required: true,
    },
    recordCount: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

export const FileUpload = mongoose.model<IFileUpload>('FileUpload', fileUploadSchema)
