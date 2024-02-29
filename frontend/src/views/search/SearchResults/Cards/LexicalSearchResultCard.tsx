import PlayCircleFilledWhiteIcon from "@mui/icons-material/PlayCircleFilledWhite";
import { Box, CardMedia, CardProps, Typography } from "@mui/material";
import SdocHooks from "../../../../api/SdocHooks.ts";
import { DocType } from "../../../../api/openapi/models/DocType.ts";
import { SourceDocumentWithDataRead } from "../../../../api/openapi/models/SourceDocumentWithDataRead.ts";
import { SearchResultProps } from "../SearchResultProps.ts";
import SearchResultCardBase from "./SearchResultCardBase.tsx";

function LexicalSearchResultCard({
  sdocId,
  handleClick,
  handleOnContextMenu,
  handleOnCheckboxChange,
  ...props
}: SearchResultProps & CardProps) {
  const thumbnailUrl = SdocHooks.useGetThumbnailURL(sdocId).data ?? "";
  return (
    <SearchResultCardBase
      sdocId={sdocId}
      handleClick={handleClick}
      handleOnContextMenu={handleOnContextMenu}
      handleOnCheckboxChange={handleOnCheckboxChange}
      {...props}
      renderContent={(sdoc) => (
        <>
          {sdoc.doctype === DocType.TEXT ? (
            <LexicalSearchResultCardTextContent sdoc={sdoc} />
          ) : sdoc.doctype === DocType.IMAGE ? (
            <CardMedia sx={{ mb: 1.5 }} component="img" height="200" image={thumbnailUrl} alt="Paella dish" />
          ) : sdoc.doctype === DocType.AUDIO ? (
            <Box sx={{ position: "relative", height: 200 }}>
              <PlayCircleFilledWhiteIcon
                sx={{
                  fontSize: 75,
                  top: "calc(50% - 37.5px)",
                  left: "calc(50% - 37.5px)",
                  position: "absolute",
                  color: "rgba(0, 0, 0, 0.666)",
                }}
              />
              <CardMedia sx={{ mb: 1.5 }} component="img" height="200" image={thumbnailUrl} alt="Tofu meatballs" />
            </Box>
          ) : sdoc.doctype === DocType.VIDEO ? (
            <Box sx={{ position: "relative", height: 200 }}>
              <PlayCircleFilledWhiteIcon
                sx={{
                  fontSize: 75,
                  top: "calc(50% - 37.5px)",
                  left: "calc(50% - 37.5px)",
                  position: "absolute",
                  color: "rgba(0, 0, 0, 0.666)",
                }}
              />
              <CardMedia sx={{ mb: 1.5 }} component="img" height="200" image={thumbnailUrl} alt="Tofu meatballs" />
            </Box>
          ) : (
            <Typography sx={{ mb: 1.5, overflow: "hidden", height: 200, textOverflow: "ellipsis" }} variant="body2">
              DOC TYPE IS NOT SUPPORTED
            </Typography>
          )}
        </>
      )}
    />
  );
}

function LexicalSearchResultCardTextContent({ sdoc }: { sdoc: SourceDocumentWithDataRead }) {
  return (
    <Typography sx={{ mb: 1.5, overflow: "hidden", height: 200, textOverflow: "ellipsis" }} variant="body2">
      {sdoc.content}
    </Typography>
  );
}

export default LexicalSearchResultCard;
