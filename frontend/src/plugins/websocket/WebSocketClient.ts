/* eslint-disable boundaries/element-types */
import { OpenAPI } from "@api/core/OpenAPI";
import { WebsocketActions } from "@store/global/websocketSlice";
import { store } from "@store/store";
import { handleWebSocketEvent } from "./websocketEventHandlers";

const RECONNECT_DELAYS_MS = [1000, 2000, 5000, 10000, 30000];

class WebSocketClient {
  private socket: WebSocket | null = null;
  private reconnectAttempt = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private intentionallyClosed = false;

  connect(): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    // Never open an unauthenticated socket: the handshake requires a token.
    if (!this.getToken()) {
      return;
    }

    this.intentionallyClosed = false;
    store.dispatch(WebsocketActions.setConnectionStatus("connecting"));

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const url = `${protocol}://${window.location.host}/api/ws`;
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      // Read the token fresh on every (re)connect: it is proactively refreshed
      // while the app is running, so a cached token would eventually be stale.
      const token = this.getToken();
      this.socket?.send(JSON.stringify({ token }));
      this.reconnectAttempt = 0;
      store.dispatch(WebsocketActions.setConnectionStatus("connected"));
    };

    this.socket.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as { type: string; payload: unknown };
        handleWebSocketEvent(data.type, data.payload);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    this.socket.onclose = () => {
      this.socket = null;
      store.dispatch(WebsocketActions.setConnectionStatus("disconnected"));
      this.scheduleReconnect();
    };

    this.socket.onerror = () => {
      // onclose fires afterwards and handles the reconnect
      this.socket?.close();
    };
  }

  disconnect(): void {
    this.intentionallyClosed = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.socket?.close();
    this.socket = null;
    store.dispatch(WebsocketActions.setConnectionStatus("disconnected"));
  }

  private scheduleReconnect(): void {
    if (this.intentionallyClosed) {
      return;
    }
    // Don't keep retrying a handshake that will fail without a token.
    if (!this.getToken()) {
      return;
    }
    const delay = RECONNECT_DELAYS_MS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)];
    this.reconnectAttempt += 1;
    this.reconnectTimeout = setTimeout(() => this.connect(), delay);
  }

  private getToken(): string | undefined {
    const token = OpenAPI.TOKEN;
    // OpenAPI.TOKEN may be a resolver; only use it when it's a plain string.
    if (typeof token === "string" && token.length > 0) {
      return token;
    }
    return localStorage.getItem("dats-access") ?? undefined;
  }
}

export const webSocketClient = new WebSocketClient();
