import { SourceDocumentRead } from "../../../api/openapi";
import * as React from "react";

export interface SearchResultItem {
  sdocId: number;
  handleClick: (sdoc: SourceDocumentRead) => void;
  handleOnContextMenu: (sdocId: number) => (event: React.MouseEvent) => void;
  handleOnCheckboxChange: (event: React.ChangeEvent<HTMLInputElement>, sdocId: number) => void;
}
