import { ActionCreatorWithPayload } from "@reduxjs/toolkit";
import { MRT_Updater } from "material-react-table";
import { useCallback, useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../plugins/ReduxHooks.ts";
import { RootState } from "../store/store.ts";

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
