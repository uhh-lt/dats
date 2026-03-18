import { RootState } from "@store/store";
import { ColumnInfo, MyFilterExpression } from "../filterUtils";
import { FilterDialogProps } from "./_components/FilterDialog";

export interface URLFilterDialogProps {
  filterName: string;
  routeApi: any;
  defaultFilterExpression: MyFilterExpression;
  column2InfoSelector: (state: RootState) => Record<string, ColumnInfo>;
  filterSearchParam?: string;
  expertModeSearchParam?: string;
}

export type URLFilterDialogViewProps = Pick<
  FilterDialogProps,
  "anchorEl" | "buttonProps" | "transformOrigin" | "anchorOrigin"
>;
