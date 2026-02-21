import {
  Autocomplete,
  AutocompleteRenderInputParams,
  ListItem,
  ListItemIcon,
  ListItemText,
  Popover,
  PopoverPosition,
  TextField,
  createFilterOptions,
} from "@mui/material";
import { memo, useCallback } from "react";
import { MetaType } from "../../../../../../api/openapi/models/MetaType.ts";
import { useDebounce } from "../../../../../../hooks/useDebounce.ts";
import { metaTypeToIcon } from "../../../../../../utils/icons/metaTypeToIcon.tsx";

const filter = createFilterOptions<string>();

interface MetadataTypeSelectorMenuProps {
  placeholder: string;
  position: PopoverPosition | undefined;
  handleClose: () => void;
  handleMenuItemClick: (newType: string) => void;
}

export const MetadataTypeSelectorMenu = memo(
  ({ placeholder, position, handleClose, handleMenuItemClick }: MetadataTypeSelectorMenuProps) => {
    const debouncedPosition = useDebounce(position, 200);

    // filter feature
    const handleChange = useCallback(
      (event: React.SyntheticEvent, newValue: string | null) => {
        event.stopPropagation();
        if (newValue === null) {
          return;
        }
        handleMenuItemClick(newValue);
        handleClose();
      },
      [handleMenuItemClick, handleClose],
    );

    const handleCloseWithEscape = useCallback(
      (_event: React.SyntheticEvent<Element, Event>, reason: string) => {
        if (reason === "escape") {
          handleClose();
        }
      },
      [handleClose],
    );

    // rendering
    const renderOption = useCallback(
      (props: React.HTMLAttributes<HTMLLIElement>, option: string) => (
        <ListItem {...props} key={option}>
          <ListItemIcon>{metaTypeToIcon[option as MetaType]}</ListItemIcon>
          <ListItemText>{option}</ListItemText>
        </ListItem>
      ),
      [],
    );

    const renderInput = useCallback(
      (params: AutocompleteRenderInputParams) => (
        <TextField autoFocus placeholder={placeholder} sx={{ bgcolor: "white" }} {...params} />
      ),
      [placeholder],
    );

    return (
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
        elevation={0}
        slotProps={{
          paper: {
            sx: { backgroundColor: "transparent !important", border: "none", p: 0, m: 0 },
          },
        }}
      >
        {Boolean(position) && Boolean(debouncedPosition) && (
          <Autocomplete
            onChange={handleChange}
            filterOptions={filter}
            options={Object.values(MetaType)}
            getOptionLabel={(option) => option}
            slotProps={{
              paper: {
                sx: { minHeight: "201px", width: "240px" },
              },
            }}
            renderOption={renderOption}
            sx={{ width: 240 }}
            renderInput={renderInput}
            handleHomeEndKeys
            open={true}
            onClose={handleCloseWithEscape}
          />
        )}
      </Popover>
    );
  },
);
