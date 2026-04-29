import mongoose from 'mongoose'

export const userRoles = ['RH', 'Manager', 'Admin'] as const
export type UserRole = (typeof userRoles)[number]

export interface IUser extends mongoose.Document {
  email: string
  passwordHash: string
  role: UserRole
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
      enum: userRoles,
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

export const User = mongoose.model<IUser>('User', userSchema)