import {
  Card,
  CardActionArea,
  CardContent,
  CardHeader,
  CardMedia,
  CardProps,
  Checkbox,
  Tooltip,
  Typography,
  styled,
} from "@mui/material";
import * as d3 from "d3";
import { SdocHooks } from "../../../api/SdocHooks.ts";
import { DocType } from "../../../api/openapi/models/DocType.ts";
import { SimSearchImageHit } from "../../../api/openapi/models/SimSearchImageHit.ts";
import { SdocTagsRenderer } from "../../../core/source-document/renderer/SdocTagRenderer.tsx";

const simSearchColorScale = d3.scaleLinear([0, 1 / 3, 2 / 3, 1], ["red", "orange", "gold", "yellowgreen"]);

const StyledCardHeader = styled(CardHeader)(() => ({
  color: "inherit",
  "& .MuiCardHeader-content": {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
}));

export interface ImageSimilaritySearchResultCardProps {
  hit: SimSearchImageHit;
  handleClick: React.MouseEventHandler<HTMLButtonElement>;
  checked: boolean;
  handleOnCheckboxChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ImageSimilaritySearchResultCard({
  hit,
  handleClick,
  checked,
  handleOnCheckboxChange,
  ...props
}: ImageSimilaritySearchResultCardProps & CardProps) {
  // query (global server state)
  const thumbnailUrl = SdocHooks.useGetThumbnailURL(hit.sdoc_id).data ?? "";
  const sdoc = SdocHooks.useGetDocument(hit.sdoc_id);

  const title = sdoc.isLoading ? "Loading" : sdoc.isError ? "Error: " : sdoc.isSuccess ? sdoc.data.name : "";

  return (
    <>
      <Card {...props}>
        <StyledCardHeader
          title={
            <Tooltip title={title} placement="top-start" enterDelay={500} followCursor>
              <Typography variant="h5">{title}</Typography>
            </Tooltip>
          }
          disableTypography
          action={
            handleOnCheckboxChange ? (
              <Checkbox
                color="primary"
                checked={checked}
                onChange={handleOnCheckboxChange}
                sx={{ flexShrink: 0 }}
                disabled={!sdoc.isSuccess}
              />
            ) : undefined
          }
        />
        <CardActionArea onClick={handleClick}>
          <CardContent sx={{ pt: 0, pb: 1 }}>
            {sdoc.isSuccess ? (
              <>
                {sdoc.data.doctype !== DocType.IMAGE ? (
                  <Typography
                    sx={{ mb: 1.5, overflow: "hidden", height: 200, textOverflow: "ellipsis" }}
                    variant="body2"
                  >
                    DOC TYPE {sdoc.data.doctype} IS NOT SUPPORTED for ImageSimilaritySearchResultCard :(
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
            ) : sdoc.isError ? (
              <Typography sx={{ mb: 1.5 }} variant="body2">
                {sdoc.error.message}
              </Typography>
            ) : (
              <Typography sx={{ mb: 1.5 }} variant="body2">
                Loading ...
              </Typography>
            )}
          </CardContent>
        </CardActionArea>
        <CardContent sx={{ py: 0 }}>
          <SdocTagsRenderer sdocId={hit.sdoc_id} stackProps={{ sx: { overflowX: "auto" } }} />
        </CardContent>
      </Card>
    </>
  );
}
