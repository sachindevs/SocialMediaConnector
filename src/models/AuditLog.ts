import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IAuditLogDoc extends Document {
  tenantId: Types.ObjectId;
  userId?: Types.ObjectId;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLogDoc>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  targetType: { type: String },
  targetId: { type: String },
  metadata: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
});

// Auto-delete records older than 90 days
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });
AuditLogSchema.index({ tenantId: 1, createdAt: -1 });

const AuditLog: Model<IAuditLogDoc> =
  mongoose.models.AuditLog || mongoose.model<IAuditLogDoc>('AuditLog', AuditLogSchema);

export default AuditLog;
