import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type WebSocketConnectionStatus = "connecting" | "connected" | "disconnected";

interface WebSocketState {
  status: WebSocketConnectionStatus;
}

const initialState: WebSocketState = {
  status: "connecting",
};

const websocketSlice = createSlice({
  name: "websocket",
  initialState,
  reducers: {
    setConnectionStatus: (state, action: PayloadAction<WebSocketConnectionStatus>) => {
      state.status = action.payload;
    },
  },
});

export const WebsocketActions = websocketSlice.actions;
export const websocketReducer = {
  [websocketSlice.name]: websocketSlice.reducer,
};
