import { EntityWorkspaceConfig } from "../../../types/EntityWorkspaceConfig";

/** Props shared by all layout shells (TABLE, LIST, GALLERY, FEED). */
export interface LayoutProps<TColumns extends string, TRow extends { id: number }> {
  config: EntityWorkspaceConfig<TColumns, TRow>;
  rows: TRow[];
  onSelect: (id: number) => void;
}
