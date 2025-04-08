import MenuIcon from "@mui/icons-material/Menu";
import {
  Autocomplete,
  Box,
  IconButton,
  IconButtonProps,
  Popover,
  PopoverPosition,
  TextField,
  UseAutocompleteProps,
  createFilterOptions,
} from "@mui/material";
import { useMemo, useState } from "react";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import { useCodesWithLevel } from "../../../components/Code/useCodesWithLevel.ts";
import { useDebounce } from "../../../utils/useDebounce.ts";

interface StatisticsFilter {
  id: number;
  title: string;
  navigateTo: string;
  color?: string;
  level: number;
}

const filter = createFilterOptions<StatisticsFilter>();

interface SearchMenuProps {
  menuItems: CodeRead[];
  handleMenuItemClick: (navigateTo: string) => void;
}

function SearchStatisticsMenu({
  menuItems,
  handleMenuItemClick,
  ...props
}: SearchMenuProps & Omit<IconButtonProps, "onClick">) {
  const [position, setPosition] = useState<PopoverPosition | undefined>();
  const debouncedPosition = useDebounce(position, 200);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    const boundingBox = event.currentTarget.getBoundingClientRect();
    setPosition({
      left: boundingBox.left,
      top: boundingBox.top + boundingBox.height,
    });
  };
  const handleClose = () => {
    setPosition(undefined);
  };

  const codesWithLevel = useCodesWithLevel(menuItems);

  // filter feature
  const options: StatisticsFilter[] = useMemo(() => {
    console.log("Creating options");
    return [
      { id: -1, title: "Keywords", navigateTo: "keywords", level: 0 },
      { id: -2, title: "Tags", navigateTo: "tags", level: 0 },
      ...codesWithLevel.map((code) => ({
        id: code.data.id,
        title: code.data.name,
        navigateTo: `${code.data.id}`,
        color: code.data.color,
        level: code.level,
      })),
    ];
  }, [codesWithLevel]);
  console.log(options);
  const handleChange: UseAutocompleteProps<StatisticsFilter, false, false, true>["onChange"] = (event, newValue) => {
    event.stopPropagation();
    if (typeof newValue === "string") {
      handleClose();
      return;
    }

    if (newValue === null) {
      return;
    }

    handleMenuItemClick(newValue.navigateTo);
    handleClose();
  };

  return (
    <>
      <IconButton onClick={handleClick} {...(props as IconButtonProps)}>
        <MenuIcon />
      </IconButton>
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
            options={options}
            getOptionLabel={(option) => {
              // Value selected with enter, right from the input
              if (typeof option === "string") {
                return option;
              }
              return option.title;
            }}
            renderOption={(props, option) => (
              <li {...props} key={option.id} style={{ paddingLeft: option.level * 10 + 6 }}>
                <Box
                  style={{
                    width: 20,
                    height: 20,
                    backgroundColor: option.color,
                    marginRight: 8,
                  }}
                ></Box>{" "}
                {option.title}
              </li>
            )}
            sx={{ width: 300 }}
            renderInput={(params) => (
              <TextField autoFocus placeholder="Filter statistics..." sx={{ bgcolor: "white" }} {...params} />
            )}
            handleHomeEndKeys
            open={true}
            onClose={(_event, reason) => reason === "escape" && handleClose()}
          />
        )}
      </Popover>
    </>
  );
}

export default SearchStatisticsMenu;
