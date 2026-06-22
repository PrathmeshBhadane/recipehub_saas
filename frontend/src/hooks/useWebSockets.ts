import { useEffect, useRef, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const WS_BASE_URL = API_BASE_URL.replace(/^http/, "ws");

export const useWebSockets = (onMessageReceived: (data: any) => void) => {
  const [connected, setConnected] = useState<boolean>(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const connect = () => {
    try {
      const socket = new WebSocket(`${WS_BASE_URL}/ws`);
      socketRef.current = socket;

      socket.onopen = () => {
        setConnected(true);
        console.log("WebSocket connected to activity feed");
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessageReceived(data);
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      socket.onclose = () => {
        setConnected(false);
        console.log("WebSocket disconnected. Reconnecting in 5 seconds...");
        // Reconnect after 5 seconds
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, 5000);
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        socket.close();
      };
    } catch (err) {
      console.error("Failed to connect to WebSocket:", err);
    }
  };

  useEffect(() => {
    connect();

    return () => {
      if (socketRef.current) {
        // Remove close listener to prevent loop on unmount
        socketRef.current.onclose = null;
        socketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const sendMessage = (msg: any) => {
    if (socketRef.current && connected) {
      socketRef.current.send(JSON.stringify(msg));
    }
  };

  return { connected, sendMessage };
};
export default useWebSockets;
