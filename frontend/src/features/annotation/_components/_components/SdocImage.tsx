import { sdocQueries } from "@api/queries/sdocQueries";
import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { ImageMenu, ImageMenuHandle } from "./ImageMenu";

interface SdocImageLinkProps {
  projectId: number;
  filename: string;
}

export function SdocImage({ projectId, filename }: SdocImageLinkProps) {
  const sdocId = useQuery(sdocQueries.idByFilename(projectId, filename));
  const sdocData = useQuery({ ...sdocQueries.data(sdocId.data!), enabled: sdocId.data !== undefined });

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
      {sdocData.isSuccess ? (
        <div>
          <img
            src={encodeURI("/content/" + sdocData.data.repo_url)}
            alt="resolved"
            style={{ maxWidth: "640px", maxHeight: "480px", cursor: "pointer" }}
            onClick={openMenu}
          />
        </div>
      ) : sdocData.isError ? (
        <div>Error: {sdocData.error.message}</div>
      ) : (
        <div>Loading img...</div>
      )}
      <ImageMenu ref={imageMenuRef} projectId={projectId} />
    </>
  );
}
