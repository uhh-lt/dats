import { CardMedia, CardProps, Typography } from "@mui/material";
import { SearchResultProps } from "../SearchResultProps";
import SdocHooks from "../../../../api/SdocHooks";
import * as React from "react";
import { DocType } from "../../../../api/openapi";
import { toThumbnailUrl } from "../../utils";
import SearchResultCardBase from "./SearchResultCardBase";

function LexicalSearchResultCard({
  sdocId,
  handleClick,
  handleOnContextMenu,
  handleOnCheckboxChange,
  ...props
}: SearchResultProps & CardProps) {
  // query (global server state)
  const content = SdocHooks.useGetDocumentContent(sdocId);

  return (
    <SearchResultCardBase
      sdocId={sdocId}
      handleClick={handleClick}
      handleOnContextMenu={handleOnContextMenu}
      handleOnCheckboxChange={handleOnCheckboxChange}
      {...props}
      renderContent={(sdoc) => {
        if (content.isSuccess) {
          return (
            <>
              {sdoc.doctype === DocType.TEXT ? (
                <Typography sx={{ mb: 1.5, overflow: "hidden", height: 200, textOverflow: "ellipsis" }} variant="body2">
                  {content.data.content}
                </Typography>
              ) : sdoc.doctype === DocType.IMAGE ? (
                <CardMedia
                  sx={{ mb: 1.5 }}
                  component="img"
                  height="200"
                  image={toThumbnailUrl(sdoc.content)}
                  alt="Paella dish"
                />
              ) : (
                <Typography sx={{ mb: 1.5, overflow: "hidden", height: 200, textOverflow: "ellipsis" }} variant="body2">
                  DOC TYPE IS NOT SUPPORTED :(
                </Typography>
              )}
            </>
          );
        }

        if (content.isError) {
          return (
            <Typography sx={{ mb: 1.5 }} variant="body2">
              {content.error.message}
            </Typography>
          );
        }

        return (
          <Typography sx={{ mb: 1.5 }} variant="body2">
            Loading ...
          </Typography>
        );
      }}
    />
  );
}

export default LexicalSearchResultCard;
