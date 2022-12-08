import * as React from "react";

export interface SearchResultEventHandlerProps {
  handleClick: (sdocId: number) => void;
  handleOnContextMenu?: (sdocId: number) => (event: React.MouseEvent) => void;
  handleOnCheckboxChange?: (event: React.ChangeEvent<HTMLInputElement>, sdocId: number) => void;
}

export interface SearchResultProps extends SearchResultEventHandlerProps {
  sdocId: number;
}
