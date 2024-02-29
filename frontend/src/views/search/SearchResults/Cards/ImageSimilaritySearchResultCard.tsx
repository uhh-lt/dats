import { CardMedia, CardProps, Tooltip, Typography } from "@mui/material";
import SdocHooks from "../../../../api/SdocHooks.ts";
import { DocType } from "../../../../api/openapi/models/DocType.ts";
import { SimSearchImageHit } from "../../../../api/openapi/models/SimSearchImageHit.ts";
import { simSearchColorScale } from "../../utils.ts";
import { SearchResultProps } from "../SearchResultProps.ts";
import SearchResultCardBase from "./SearchResultCardBase.tsx";

export interface ImageSimilaritySearchResultCardProps extends SearchResultProps {
  hit: SimSearchImageHit;
}

function ImageSimilaritySearchResultCard({ hit, ...props }: ImageSimilaritySearchResultCardProps & CardProps) {
  const thumbnailUrl = SdocHooks.useGetThumbnailURL(props.sdocId).data ?? "";

  return (
    <SearchResultCardBase
      {...props}
      renderContent={(sdoc) => {
        return (
          <>
            {sdoc.doctype !== DocType.IMAGE ? (
              <Typography sx={{ mb: 1.5, overflow: "hidden", height: 200, textOverflow: "ellipsis" }} variant="body2">
                DOC TYPE {sdoc.doctype} IS NOT SUPPORTED for ImageSimilaritySearchResultCard :(
              </Typography>
            ) : (
              <Tooltip title={`Score: ${hit.score.toFixed(4)}`}>
                <CardMedia
                  sx={{ mb: 1.5, border: `5px solid ${simSearchColorScale(hit.score)}` }}
                  component="img"
                  height="200"
                  image={thumbnailUrl}
                  alt="Paella dish"
                />
              </Tooltip>
            )}
          </>
        );
      }}
    />
  );
}

export default ImageSimilaritySearchResultCard;
