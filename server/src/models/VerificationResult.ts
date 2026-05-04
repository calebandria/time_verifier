import mongoose from 'mongoose'

export interface IVerificationResult extends mongoose.Document {
  managerEmail: string
  teamName?: string
  employeeId: string
  employeeName?: string
  plannedTime: Date | null
  actualTime: Date | null
  status: 'early' | 'on-time' | 'late' | 'absent' | 'no-plan' | 'leave'
  minutesDifference: number | null
  createdAt: Date
  updatedAt: Date
}

const verificationResultSchema = new mongoose.Schema<IVerificationResult>(
  {
    managerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    teamName: {
      type: String,
      required: false,
    },
    employeeId: {
      type: String,
      required: true,
    },
    employeeName: {
      type: String,
      required: false,
    },
    plannedTime: {
      type: Date,
      required: false,
    },
    actualTime: {
      type: Date,
      required: false,
    },
    status: {
      type: String,
      enum: ['early', 'on-time', 'late', 'absent', 'no-plan', 'leave'],
      required: true,
    },
    minutesDifference: {
      type: Number,
      required: false,
    },
  },
  {
    timestamps: true,
  },
)

export const VerificationResult = mongoose.model<IVerificationResult>(
  'VerificationResult',
  verificationResultSchema,
)
