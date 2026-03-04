import type { AppDispatch, RootState } from "@store/store";
import { TypedUseSelectorHook, useDispatch, useSelector, useStore } from "react-redux";

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppStore = () => useStore<RootState>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
