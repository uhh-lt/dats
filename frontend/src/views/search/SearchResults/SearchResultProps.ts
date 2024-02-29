import * as React from "react";
import { SourceDocumentRead } from "../../../api/openapi/models/SourceDocumentRead.ts";

export interface SearchResultEventHandlerProps {
  handleClick: (sdoc: SourceDocumentRead) => void;
  handleOnContextMenu?: (sdocId: number) => (event: React.MouseEvent) => void;
  handleOnCheckboxChange?: (event: React.ChangeEvent<HTMLInputElement>, sdocId: number) => void;
}

export interface SearchResultProps extends SearchResultEventHandlerProps {
  sdocId: number;
}
