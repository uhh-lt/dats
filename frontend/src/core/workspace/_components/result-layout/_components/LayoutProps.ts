import { EntityWorkspaceConfig } from "../../../types/EntityWorkspaceConfig";

/** Props shared by all layout shells (TABLE, LIST, GALLERY, FEED). */
export interface LayoutProps<TColumns extends string, TRow extends { id: number }> {
  config: EntityWorkspaceConfig<TColumns, TRow>;
  rows: TRow[];
  onSelect: (id: number) => void;
  /** The properties the user selected to render (drives card/list/feed flags). */
  selectedProperties: TColumns[];
  /**
   * Whether to virtualize the rows. Only valid when the shell sits at the top of its own scroll
   * container (ungrouped list, board lane). Collapsible groups render unvirtualized because their
   * content is offset below a header within a shared outer scroller. Defaults to true.
   */
  virtualize?: boolean;
}
