import { SdocHooks, sdocQueries } from "@core/source-document";
import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { ImageMenu, ImageMenuHandle } from "./ImageMenu";

interface SdocImageLinkProps {
  projectId: number;
  filename: string;
}

export function SdocImage({ projectId, filename }: SdocImageLinkProps) {
  const sdocId = useQuery(sdocQueries.idByFilename(projectId, filename));
  const sdocUrls = SdocHooks.useGetURLs(sdocId.data);

  const imageMenuRef = useRef<ImageMenuHandle>(null);

  const openMenu = (event: React.MouseEvent) => {
    if (imageMenuRef.current) {
      const position = {
        left: event.clientX,
        top: event.clientY,
      };
      imageMenuRef.current.open(position, sdocId.data);
    }
  };

  return (
    <>
      {sdocUrls.isSuccess ? (
        <div>
          <img
            src={sdocUrls.data.image_url ?? undefined}
            alt="resolved"
            style={{ maxWidth: "640px", maxHeight: "480px", cursor: "pointer" }}
            onClick={openMenu}
          />
        </div>
      ) : sdocUrls.isError ? (
        <div>Error: {sdocUrls.error.message}</div>
      ) : (
        <div>Loading img...</div>
      )}
      <ImageMenu ref={imageMenuRef} projectId={projectId} />
    </>
  );
}
