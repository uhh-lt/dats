import { ProcessingSettings } from "@api/models/ProcessingSettings";
import { SdocStatusRow } from "@api/models/SdocStatusRow";
import { FilterTableToolbarProps } from "@core/filter";
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
