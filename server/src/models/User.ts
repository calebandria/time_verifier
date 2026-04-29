import mongoose from 'mongoose'

export interface IUser extends mongoose.Document {
  email: string
  passwordHash: string
  role: 'RH' | 'Manager'
  createdAt: Date
  updatedAt: Date
}

const userSchema = new mongoose.Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['RH', 'Manager'],
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

export const User = mongoose.model<IUser>('User', userSchema)