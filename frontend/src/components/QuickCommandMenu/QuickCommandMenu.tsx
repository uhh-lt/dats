import { Search } from "@mui/icons-material";
import {
  Autocomplete,
  InputAdornment,
  ListItem,
  ListItemIcon,
  ListItemText,
  Popover,
  TextField,
  alpha,
} from "@mui/material";
import { SyntheticEvent, useCallback, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../dialogSlice.ts";
import { CommandItem } from "./CommandItem";
import { useDefaultCommands } from "./useDefaultCommands.tsx";
import { useNavigate } from "@tanstack/react-router";

function QuickCommandMenu({ projectId }: { projectId: number }) {
  // generate commands
  const commands = useDefaultCommands(projectId);

  // open close the menu
  const anchorRef = useRef<HTMLDivElement>(null);
  const isOpen = useAppSelector((state) => state.dialog.isQuickCommandMenuOpen);
  const dispatch = useAppDispatch();
  const closeMenu = useCallback(() => dispatch(CRUDDialogActions.closeQuickCommandMenu()), [dispatch]);

  // handle comands
  const navigate = useNavigate();
  const handleCommandSelect = useCallback(
    (_event: SyntheticEvent, command: CommandItem | null) => {
      if (command) {
        if (command.action) {
          command.action();
        } else if (command.route) {
          navigate({ to: command.route });
        }
        closeMenu();
      }
    },
    [navigate, closeMenu],
  );

  return (
    <Popover
      open={isOpen}
      onClose={closeMenu}
      anchorReference="anchorPosition"
      anchorPosition={{ top: 24, left: window.innerWidth / 2 }}
      transformOrigin={{
        vertical: "top",
        horizontal: "center",
      }}
      slotProps={{
        paper: {
          ref: anchorRef,
          className: "myFlexContainer",
          sx: {
            width: "600px",
            maxWidth: "90vw",
            boxShadow: (theme) => `0 0 10px ${alpha(theme.palette.common.black, 0.2)}`,
            backgroundColor: (theme) => theme.palette.background.paper,
            "& .MuiAutocomplete-listbox": {
              maxHeight: "50vh",
            },
          },
        },
        backdrop: {
          sx: { backgroundColor: "rgba(0, 0, 0, 0.2)" },
        },
      }}
    >
      <Autocomplete
        open={isOpen}
        onClose={(_, reason) => {
          if (reason === "blur" || reason === "toggleInput") return;
          closeMenu();
        }}
        autoHighlight
        autoFocus
        disablePortal={true}
        options={commands}
        onChange={handleCommandSelect}
        groupBy={(option) => option.category}
        getOptionLabel={(option) => option.title}
        filterOptions={(options, { inputValue }) => {
          const searchTerms = inputValue.toLowerCase().split(" ");
          return options.filter((option) => {
            const searchableText = [option.title, option.description, ...(option.keywords || [])]
              .join(" ")
              .toLowerCase();

            return searchTerms.every((term) => searchableText.includes(term));
          });
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Type a command or search..."
            variant="outlined"
            autoFocus
            slotProps={{
              input: {
                ...params.InputProps,
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                endAdornment: null,
              },
            }}
            sx={{
              p: 1,
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  border: "none",
                },
              },
            }}
          />
        )}
        renderOption={({ key, ...props }, option) => (
          <ListItem key={key} {...props}>
            {option.icon && <ListItemIcon sx={{ minWidth: 40 }}>{option.icon}</ListItemIcon>}
            <ListItemText primary={option.title} secondary={option.description} />
          </ListItem>
        )}
        sx={{
          "& .MuiFormControl-root": {
            padding: 0,
          },
        }}
        slotProps={{
          popper: {
            className: "myFlexFillAllContainer",
            sx: {
              position: "relative !important",
              transform: "none !important",
              width: "100% !important",
            },
          },
          paper: {
            sx: {
              borderRadius: 0,
            },
          },
        }}
      />
    </Popover>
  );
}

export default QuickCommandMenu;
