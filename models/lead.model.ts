import mongoose, { Document, Schema } from 'mongoose';

export interface ILead extends Document {
  chatbox: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  chatbotName: string;
  chatbotDisplayName?: string;
  organizationName?: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  message?: string;
  sourceMessage?: string;
  conversationId?: string;
  metadata?: Record<string, unknown>;
  status: 'new' | 'in_progress' | 'contacted' | 'converted' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    chatbox: { type: Schema.Types.ObjectId, ref: 'Chatbox', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    chatbotName: { type: String, required: true },
    chatbotDisplayName: { type: String },
    organizationName: { type: String },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    company: { type: String, required: true },
    message: { type: String },
    sourceMessage: { type: String },
    conversationId: { type: String, index: true },
    metadata: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['new', 'in_progress', 'contacted', 'converted', 'closed'],
      default: 'new',
    },
  },
  {
    timestamps: true,
  }
);

LeadSchema.index({ createdBy: 1, createdAt: -1 });
LeadSchema.index({ chatbox: 1, createdAt: -1 });

const Lead = mongoose.model<ILead>('Lead', LeadSchema);

export default Lead;

