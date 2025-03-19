import { Button, PopoverPosition } from "@mui/material";
import React, { memo, useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import MetadataHooks from "../../../../api/MetadataHooks.ts";
import SdocHooks from "../../../../api/SdocHooks.ts";
import { MetaType } from "../../../../api/openapi/models/MetaType.ts";
import { Icon, getIconComponent } from "../../../../utils/icons/iconUtils.tsx";
import MetadataTypeSelectorMenu from "./MetadataTypeSelectorMenu.tsx";

interface MetadataCreateButtonProps {
  sdocId: number;
}

function MetadataCreateButton({ sdocId }: MetadataCreateButtonProps) {
  const [position, setPosition] = useState<PopoverPosition | undefined>();

  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const boundingBox = event.currentTarget.getBoundingClientRect();
    setPosition({
      left: boundingBox.left,
      top: boundingBox.top + boundingBox.height,
    });
  }, []);

  const handleClose = useCallback(() => {
    setPosition(undefined);
  }, []);

  // create
  const projectId = parseInt((useParams() as { projectId: string }).projectId);
  const sdoc = SdocHooks.useGetDocument(sdocId);
  const { mutate: createMetadataMutation } = MetadataHooks.useCreateProjectMetadata();

  const handleCreateMetadata = useCallback(
    (metaType: string) => {
      if (!sdoc.data) return;

      createMetadataMutation({
        requestBody: {
          doctype: sdoc.data.doctype,
          metatype: metaType as MetaType,
          key: `${metaType.toLowerCase()} (new)`,
          project_id: projectId,
          read_only: false,
          description: "Placeholder description",
        },
      });
    },
    [createMetadataMutation, projectId, sdoc.data],
  );

  return (
    <>
      <Button variant="text" size="small" startIcon={getIconComponent(Icon.ADD)} onClick={handleClick}>
        Add Metadata
      </Button>
      <MetadataTypeSelectorMenu
        placeholder="Add new metadata..."
        position={position}
        handleClose={handleClose}
        handleMenuItemClick={handleCreateMetadata}
      />
    </>
  );
}

export default memo(MetadataCreateButton);
