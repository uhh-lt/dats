import {
  Box,
  Button,
  Divider,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Popover,
  PopoverPosition,
  Stack,
  TextField,
  Tooltip,
} from "@mui/material";
import { ChangeEventHandler, MouseEventHandler, useCallback, useState } from "react";
import { MetadataHooks } from "../../../../../../api/MetadataHooks.ts";
import { MetaType } from "../../../../../../api/openapi/models/MetaType.ts";
import { ProjectMetadataRead } from "../../../../../../api/openapi/models/ProjectMetadataRead.ts";
import { ConfirmationAPI } from "../../../../../../components/ConfirmationDialog/ConfirmationAPI.ts";
import { Icon, getIconComponent } from "../../../../../../utils/icons/iconUtils.tsx";
import { metaTypeToIcon } from "../../../../../../utils/icons/metaTypeToIcon.tsx";
import { MetadataTypeSelectorMenu } from "./MetadataTypeSelectorMenu.tsx";

interface MetadataEditMenuProps {
  projectMetadata: ProjectMetadataRead;
}

export function MetadataEditMenu({ projectMetadata }: MetadataEditMenuProps) {
  // open close popover
  const [position, setPosition] = useState<PopoverPosition | undefined>();
  const handleClick: MouseEventHandler<HTMLButtonElement> = (event) => {
    const boundingBox = event.currentTarget.getBoundingClientRect();
    setPosition({
      left: boundingBox.left,
      top: boundingBox.top + boundingBox.height,
    });
  };

  // metadata name
  const [name, setName] = useState(projectMetadata.key);
  const handleChangeName: ChangeEventHandler<HTMLInputElement> = (event) => {
    setName(event.target.value);
  };

  // metadata description
  const [description, setDescription] = useState(projectMetadata.description);
  const handleChangeDescription: ChangeEventHandler<HTMLInputElement> = (event) => {
    setDescription(event.target.value);
  };

  // change type
  const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false);
  const [metatype, setMetatype] = useState(projectMetadata.metatype);
  const handleChangeType = (newType: string) => {
    setMetatype(newType as MetaType);
  };

  // closing / confirming changes
  const updateMutation = MetadataHooks.useUpdateProjectMetadata();
  const handleClose = () => {
    setPosition(undefined);

    // only update if data has changed!
    if (
      projectMetadata.metatype !== metatype ||
      projectMetadata.key !== name ||
      projectMetadata.description !== description
    ) {
      const mutation = updateMutation.mutate;
      const actuallyMutate = () =>
        mutation({
          metadataId: projectMetadata.id,
          requestBody: {
            metatype: metatype,
            key: name,
            description: description,
          },
        });
      if (projectMetadata.metatype !== metatype) {
        ConfirmationAPI.openConfirmationDialog({
          text: "Changing the type of this metadata will remove its existing entries. This action cannot be undone. Do you want to proceed?",
          onAccept: actuallyMutate,
          onReject() {
            setMetatype(projectMetadata.metatype);
          },
        });
      } else {
        actuallyMutate();
      }
    }
  };

  // deletion
  const deleteMutation = MetadataHooks.useDeleteProjectMetadata();
  const handleDeleteMetadata = useCallback(() => {
    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to delete the ProjectMetadata ${projectMetadata.id}? This will remove metadata from all corresponding documents. This action cannot be undone!`,
      onAccept: () => {
        const mutation = deleteMutation.mutate;
        mutation({
          metadataId: projectMetadata.id,
        });
      },
    });
  }, [deleteMutation.mutate, projectMetadata.id]);

  return (
    <>
      <Tooltip title={projectMetadata.description} placement="left">
        <span style={{ flexGrow: 1, flexBasis: 1, justifyContent: "start" }}>
          <Button
            onClick={handleClick}
            color="inherit"
            startIcon={metaTypeToIcon[projectMetadata.metatype]}
            disabled={projectMetadata.read_only}
          >
            {projectMetadata.key}
          </Button>
        </span>
      </Tooltip>
      <Popover
        open={Boolean(position)}
        onClose={handleClose}
        anchorPosition={position}
        anchorReference="anchorPosition"
        anchorOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        elevation={2}
        slotProps={{ paper: { sx: { width: 240 } } }}
      >
        <Stack gap={2} p={1}>
          <TextField fullWidth size="small" value={name} onChange={handleChangeName} label="Name" />
          <TextField
            fullWidth
            size="small"
            value={description}
            onChange={handleChangeDescription}
            label="Description"
          />
        </Stack>
        <ListItem disablePadding>
          <ListItemButton onClick={() => setIsTypeMenuOpen(true)}>
            <ListItemText>Type</ListItemText>
            <Box sx={{ textAlign: "right", color: "text.secondary", display: "flex", alignItems: "center", gap: 1 }}>
              {metaTypeToIcon[metatype]}
              {metatype}
            </Box>
          </ListItemButton>
        </ListItem>
        <Divider />
        <ListItem disablePadding>
          <ListItemButton disabled>
            <ListItemIcon>{getIconComponent(Icon.DUPLICATE)}</ListItemIcon>
            <ListItemText>Duplicate metadata</ListItemText>
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={handleDeleteMetadata}>
            <ListItemIcon>{getIconComponent(Icon.DELETE)}</ListItemIcon>
            <ListItemText>Delete metadata</ListItemText>
          </ListItemButton>
        </ListItem>
      </Popover>
      <MetadataTypeSelectorMenu
        placeholder="Change type..."
        position={isTypeMenuOpen ? position : undefined}
        handleClose={() => setIsTypeMenuOpen(false)}
        handleMenuItemClick={handleChangeType}
      />
    </>
  );
}
