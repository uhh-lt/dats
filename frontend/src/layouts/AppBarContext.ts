import { createContext } from "react";

export const AppBarContext = createContext<React.MutableRefObject<HTMLDivElement | null> | null>(null);
