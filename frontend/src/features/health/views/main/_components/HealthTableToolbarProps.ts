import { FilterTableToolbarProps } from "@core/filter";
import { SdocStatusRow } from "@models/SdocStatusRow";

export interface HealthTableToolbarProps extends FilterTableToolbarProps<SdocStatusRow> {
  onRefetch: () => void;
  isRefreshing: boolean;
}
