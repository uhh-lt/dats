import createWebStorage from "redux-persist/es/storage/createWebStorage";

// The storage of every persisted slice: persistReducer({ key: xSlice.name, storage: persistStorage }, xSlice.reducer)
export const persistStorage = createWebStorage("local");
