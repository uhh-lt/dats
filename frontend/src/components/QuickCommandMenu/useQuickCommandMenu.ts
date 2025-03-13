import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks";
import { closeMenu, selectAvailableCommands } from "./quickCommandMenuSlice";

export const useQuickCommandMenu = () => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.quickCommandMenu.isOpen);
  const commands = useAppSelector(selectAvailableCommands);

  return {
    isOpen,
    commands,
    closeMenu: () => dispatch(closeMenu()),
  };
};
