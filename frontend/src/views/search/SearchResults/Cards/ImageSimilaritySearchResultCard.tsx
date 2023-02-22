import { CardMedia, CardProps, Tooltip, Typography } from "@mui/material";
import { SearchResultProps } from "../SearchResultProps";
import * as React from "react";
import { DocType, SimSearchImageHit } from "../../../../api/openapi";
import { simSearchColorScale, toThumbnailUrl } from "../../utils";
import SearchResultCardBase from "./SearchResultCardBase";

export interface ImageSimilaritySearchResultCardProps extends SearchResultProps {
  hit: SimSearchImageHit;
}

function ImageSimilaritySearchResultCard({ hit, ...props }: ImageSimilaritySearchResultCardProps & CardProps) {
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
              <Tooltip title={`Score: ${hit.score}`}>
                <CardMedia
                  sx={{ mb: 1.5, border: `5px solid ${simSearchColorScale(hit.score)}` }}
                  component="img"
                  height="200"
                  image={toThumbnailUrl(sdoc.content)}
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