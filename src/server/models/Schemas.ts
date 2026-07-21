import mongoose, { Schema, Document } from "mongoose";

// Real MongoDB Schemas

export interface IUserDoc extends Document {
  username: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export const UserSchema = new Schema<IUserDoc>({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export interface IRoomDoc extends Document {
  code: string;
  name: string;
  creatorId: string;
  creatorName: string;
  isPrivate: boolean;
  joinPolicy: "direct" | "approval";
  members: string[];
  pendingApprovals: { userId: string; username: string }[];
  createdAt: Date;
  isTemporary: boolean;
  expiresAt?: Date;
  timerPaused: boolean;
}

export const RoomSchema = new Schema<IRoomDoc>({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  creatorId: { type: String, required: true },
  creatorName: { type: String, required: true },
  isPrivate: { type: Boolean, default: false },
  joinPolicy: { type: String, enum: ["direct", "approval"], default: "direct" },
  members: { type: [String], default: [] },
  pendingApprovals: [
    {
      userId: { type: String, required: true },
      username: { type: String, required: true }
    }
  ],
  createdAt: { type: Date, default: Date.now },
  isTemporary: { type: Boolean, default: false },
  expiresAt: { type: Date },
  timerPaused: { type: Boolean, default: false },
});

export interface IMessageDoc extends Document {
  roomId: string;
  userId: string;
  username: string;
  text: string;
  createdAt: Date;
  fileId?: string;
}

export const MessageSchema = new Schema<IMessageDoc>({
  roomId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  fileId: { type: String },
});

export interface IFileDoc extends Document {
  filename: string;
  originalname: string;
  size: number;
  mimetype: string;
  uploaderId: string;
  uploaderName: string;
  passwordHash?: string;
  uploadTime: Date;
  dataBuffer?: Buffer; // Used as standard storage fallback or when GridFS is not used
}

export const FileSchema = new Schema<IFileDoc>({
  filename: { type: String, required: true },
  originalname: { type: String, required: true },
  size: { type: Number, required: true },
  mimetype: { type: String, required: true },
  uploaderId: { type: String, required: true },
  uploaderName: { type: String, required: true },
  passwordHash: { type: String },
  uploadTime: { type: Date, default: Date.now },
  dataBuffer: { type: Schema.Types.Buffer } as any,
});

// We lazily initialize models because if mongoose is not connected yet, it may fail
export let UserModel: mongoose.Model<IUserDoc>;
export let RoomModel: mongoose.Model<IRoomDoc>;
export let MessageModel: mongoose.Model<IMessageDoc>;
export let FileModel: mongoose.Model<IFileDoc>;

export function initMongooseModels(connection: mongoose.Connection) {
  UserModel = connection.model<IUserDoc>("User", UserSchema);
  RoomModel = connection.model<IRoomDoc>("Room", RoomSchema);
  MessageModel = connection.model<IMessageDoc>("Message", MessageSchema);
  FileModel = connection.model<IFileDoc>("File", FileSchema);
}
