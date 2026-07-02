import { FilterTableToolbarProps } from "@core/filter";
import { ProcessingSettings } from "@models/ProcessingSettings";
import { SdocStatusRow } from "@models/SdocStatusRow";
import { Dispatch, SetStateAction } from "react";

export interface HealthTableToolbarProps extends FilterTableToolbarProps<SdocStatusRow> {
  selectedRows: number[];
  tableColumnInfo: string[];
  settings: ProcessingSettings;
  onChangeSettings: Dispatch<SetStateAction<ProcessingSettings>>;
  isRetryPending: boolean;
  isRecomputePending: boolean;
  onRetry: () => void;
  onRecompute: (step: string) => void;
  onRefetch: () => void;
  isRefreshing: boolean;
}
