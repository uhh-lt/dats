import { ActionCreatorWithPayload } from "@reduxjs/toolkit";
import type { AppDispatch, RootState } from "@store/store";
import { MRT_Updater } from "material-react-table";
import { useCallback, useEffect, useState } from "react";
import { TypedUseSelectorHook, useDispatch, useSelector, useStore } from "react-redux";

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppStore = () => useStore<RootState>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Use this hook to connect a local state to a redux state. It will update the local state when the redux state changes and dispatch the provided action when the local state changes.
export function useReduxConnector<T>(
  reduxStateSelectorFn: (state: RootState) => T,
  reduxAction: ActionCreatorWithPayload<T>,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const reduxState = useAppSelector(reduxStateSelectorFn);
  const [state, setState] = useState<T>(reduxState);
  const dispatch = useAppDispatch();

  const onStateChange = useCallback(
    (updater: MRT_Updater<T>) => {
      setState((oldState) => {
        const newState = updater instanceof Function ? updater(oldState) : updater;
        dispatch(reduxAction(newState));
        return newState;
      });
    },
    [dispatch, reduxAction],
  );

  useEffect(() => {
    setState(reduxState);
  }, [reduxState]);

  return [state, onStateChange];
}
