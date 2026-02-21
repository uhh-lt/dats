import PlayCircleFilledWhiteIcon from "@mui/icons-material/PlayCircleFilledWhite";
import { Box } from "@mui/material";
import { SdocHooks } from "../../../../../api/SdocHooks.ts";
import { LinkLink } from "../../../../../components/MUI/LinkLink.tsx";

interface SdocVideoLinkProps {
  projectId: number;
  filename: string;
}

export function SdocVideoLink({ projectId, filename }: SdocVideoLinkProps) {
  const sdocId = SdocHooks.useGetDocumentIdByFilename(filename, projectId);
  const thumbnailUrl = SdocHooks.useGetThumbnailURL(sdocId.data);

  return (
    <>
      {thumbnailUrl.isSuccess && sdocId.isSuccess ? (
        <div>
          <LinkLink to="/project/$projectId/annotation/$sdocId" params={{ sdocId: sdocId.data, projectId }}>
            <Box sx={{ position: "relative", height: 200, textAlign: "center" }}>
              <PlayCircleFilledWhiteIcon
                sx={{
                  fontSize: 75,
                  top: "calc(50% - 37.5px)",
                  left: "calc(50% - 37.5px)",
                  position: "absolute",
                  color: "rgba(0, 0, 0, 0.666)",
                }}
              />
              <img style={{ marginBottom: 1.5 }} height="200" src={thumbnailUrl.data} alt="Tofu meatballs" />
            </Box>
          </LinkLink>
        </div>
      ) : thumbnailUrl.isError ? (
        <div>Error: {thumbnailUrl.error.message}</div>
      ) : (
        <div>Loading video...</div>
      )}
    </>
  );
}
