import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { persistStorage } from "@store/persistStorage";
import { AgentName } from "@models/AgentName";
import { persistReducer } from "redux-persist";
import { DEFAULT_MODEL } from "../_utils/agentModelUtils";

interface AgentState {
  // user preferences, kept across projects: the agent of new chats and the LLM
  agentName: AgentName;
  modelName: string;
}

const initialState: AgentState = {
  agentName: AgentName.PROJECT,
  modelName: DEFAULT_MODEL,
};

const agentSlice = createSlice({
  name: "agent",
  initialState,
  reducers: {
    onAgentNameChange: (state, action: PayloadAction<AgentName>) => {
      state.agentName = action.payload;
    },
    onModelNameChange: (state, action: PayloadAction<string>) => {
      state.modelName = action.payload;
    },
  },
});

export const AgentActions = agentSlice.actions;

export const agentReducer = {
  [agentSlice.name]: persistReducer({ key: agentSlice.name, storage: persistStorage }, agentSlice.reducer),
};
