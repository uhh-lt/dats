import { Slice } from "@reduxjs/toolkit";
import { createContext, useContext } from "react";
import { useAppSelector } from "../../plugins/ReduxHooks";
import { FilterReducer, FilterState, searchFilterSlice } from "./filterSlice";

const FilterContext = createContext<Slice<FilterState, FilterReducer, string>>(searchFilterSlice);

const FilterSliceProvider = ({
  slice,
  children,
}: {
  slice: Slice<FilterState, FilterReducer, string>;
  children: React.ReactNode;
}) => <FilterContext.Provider value={slice}>{children}</FilterContext.Provider>;

// todo: is this stable across rerenders???
const useFilterSliceActions = () => useContext(FilterContext).actions;

const useFilterSliceSelector = () => {
  const { name } = useContext(FilterContext);
  return useAppSelector((state) => {
    return state[name];
  }) as FilterState;
};

export default FilterSliceProvider;
export { useFilterSliceActions, useFilterSliceSelector };
