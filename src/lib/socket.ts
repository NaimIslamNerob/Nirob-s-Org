import { getStoredToken } from './api';

type Listener = (payload: any) => void;

class SocketService {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<Listener>> = new Map();
  private reconnectTimer: any = null;
  private isConnecting = false;

  connect() {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        clearTimeout(this.reconnectTimer);
        const token = getStoredToken();
        if (token) {
          this.send('auth', {}, token);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const { event: evtName, payload } = data;
          if (evtName && this.listeners.has(evtName)) {
            this.listeners.get(evtName)!.forEach((cb) => {
              try {
                cb(payload);
              } catch (err) {
                console.error(`Error in socket listener for ${evtName}:`, err);
              }
            });
          }
        } catch (err) {
          console.error('Socket message parse error:', err);
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.ws = null;
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        this.isConnecting = false;
        this.ws = null;
        this.scheduleReconnect();
      };
    } catch (err) {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, 2500);
  }

  reauth() {
    const token = getStoredToken();
    if (this.ws && this.ws.readyState === WebSocket.OPEN && token) {
      this.send('auth', {}, token);
    } else {
      this.connect();
    }
  }

  send(type: string, payload: any = {}, tokenOverride?: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    const token = tokenOverride || getStoredToken();
    this.ws.send(JSON.stringify({ type, token, payload }));
  }

  on(event: string, callback: Listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => {
      this.off(event, callback);
    };
  }

  off(event: string, callback: Listener) {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(callback);
    }
  }

  startTyping(recipientId: string) {
    this.send('typing:start', { recipientId });
  }

  stopTyping(recipientId: string) {
    this.send('typing:stop', { recipientId });
  }
}

export const socket = new SocketService();
