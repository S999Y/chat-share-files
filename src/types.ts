export interface User {
  _id: string;
  username: string;
  email: string;
  createdAt: Date;
}

export interface Room {
  _id: string;
  code: string; // 6-digit room code
  name: string;
  creatorId: string;
  creatorName: string;
  createdAt: Date;
}

export interface Message {
  _id: string;
  roomId: string;
  userId: string;
  username: string;
  text: string;
  createdAt: Date;
  fileId?: string;
  file?: SharedFile;
}

export interface SharedFile {
  _id: string;
  filename: string;
  originalname: string;
  size: number;
  mimetype: string;
  uploaderId: string;
  uploaderName: string;
  hasPassword: boolean;
  uploadTime: Date;
}
