import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { Message } from "../types.js";
import { useAuth } from "./AuthContext.js";

interface SocketContextType {
  socket: Socket | null;
  onlineUsers: Array<{ userId: string; username: string; socketId: string }>;
  messages: Array<any>; // Can hold standard Messages or system/join/leave logs
  typingUsers: string[];
  joinRoom: (roomId: string, userId: string, username: string) => void;
  leaveRoom: (roomId: string, userId: string, username: string) => void;
  sendMessage: (roomId: string, userId: string, username: string, text: string, fileId?: string) => void;
  sendTyping: (roomId: string, username: string, isTyping: boolean) => void;
  setRoomMessages: React.Dispatch<React.SetStateAction<any[]>>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // Initialize socket connection
  useEffect(() => {
    // Connect to same host as backend (empty string / window.location.origin)
    const socketInstance = io(window.location.origin, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      console.log("🔌 Connected to WebSocket server!");
    });

    socketInstance.on("disconnect", () => {
      console.log("🔌 Disconnected from WebSocket server.");
    });

    // Listen for room-specific events
    socketInstance.on("online-users", (users: any[]) => {
      setOnlineUsers(users);
    });

    socketInstance.on("user-joined", (data: { userId: string; username: string; message: string; timestamp: Date }) => {
      setMessages((prev) => [
        ...prev,
        {
          _id: `join-${Date.now()}-${Math.random()}`,
          isSystem: true,
          text: data.message,
          createdAt: data.timestamp,
        },
      ]);
    });

    socketInstance.on("user-left", (data: { userId: string; username: string; message: string; timestamp: Date }) => {
      setMessages((prev) => [
        ...prev,
        {
          _id: `leave-${Date.now()}-${Math.random()}`,
          isSystem: true,
          text: data.message,
          createdAt: data.timestamp,
        },
      ]);
    });

    socketInstance.on("receive-message", (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    socketInstance.on("message-deleted", (data: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m._id !== data.messageId));
    });

    socketInstance.on("file-deleted", (data: { fileId: string }) => {
      setMessages((prev) => prev.map((m) => {
        if (m.fileId === data.fileId) {
          const { file, fileId, ...rest } = m;
          return { ...rest, text: `${rest.text} (File deleted)` };
        }
        return m;
      }));
    });

    socketInstance.on("user-typing", (data: { username: string; isTyping: boolean }) => {
      setTypingUsers((prev) => {
        if (data.isTyping) {
          if (prev.includes(data.username)) return prev;
          return [...prev, data.username];
        } else {
          return prev.filter((name) => name !== data.username);
        }
      });
    });

    socketInstance.on("error-message", (data: { error: string }) => {
      console.error("Socket error message:", data.error);
    });

    // Clean up on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, [token]);

  const joinRoom = (roomId: string, userId: string, username: string) => {
    if (socket) {
      setMessages([]); // Reset room-specific messages
      setOnlineUsers([]);
      setTypingUsers([]);
      socket.emit("join-room", { roomId, userId, username });
    }
  };

  const leaveRoom = (roomId: string, userId: string, username: string) => {
    if (socket) {
      socket.emit("leave-room", { roomId, userId, username });
    }
  };

  const sendMessage = (roomId: string, userId: string, username: string, text: string, fileId?: string) => {
    if (socket) {
      socket.emit("send-message", { roomId, userId, username, text, fileId });
    }
  };

  const sendTyping = (roomId: string, username: string, isTyping: boolean) => {
    if (socket) {
      socket.emit("typing", { roomId, username, isTyping });
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        onlineUsers,
        messages,
        typingUsers,
        joinRoom,
        leaveRoom,
        sendMessage,
        sendTyping,
        setRoomMessages: setMessages,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
