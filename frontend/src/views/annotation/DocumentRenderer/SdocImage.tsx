import { useRef } from "react";
import SdocHooks from "../../../api/SdocHooks.ts";
import ImageMenu, { ImageMenuHandle } from "./ImageMenu.tsx";

interface SdocImageLinkProps {
  projectId: number;
  filename: string;
}

function SdocImage({ projectId, filename }: SdocImageLinkProps) {
  const sdocId = SdocHooks.useGetDocumentIdByFilename(filename, projectId);
  const url = SdocHooks.useGetURL(sdocId.data, true);
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
      {sdocId.isSuccess && url.isSuccess ? (
        <div>
          <img
            src={url.data}
            alt="resolved"
            data-sdoc-id={sdocId.data}
            style={{ maxWidth: "640px", maxHeight: "480px", cursor: "pointer" }}
            onClick={openMenu}
          />
        </div>
      ) : sdocId.isSuccess && !url.isSuccess ? (
        <img alt={`Could not resolve ${filename} :(`} />
      ) : sdocId.isError ? (
        <div>Error: {sdocId.error.message}</div>
      ) : url.isError ? (
        <div>Error: {url.error.message}</div>
      ) : (
        <div>Loading img...</div>
      )}
      <ImageMenu ref={imageMenuRef} />
    </>
  );
}

export default SdocImage;
