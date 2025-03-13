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
import { SyntheticEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CommandItem } from "./CommandItem";
import { useQuickCommandMenu } from "./useQuickCommandMenu";

const QuickCommandMenu = () => {
  const { isOpen, closeMenu, commands } = useQuickCommandMenu();
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const navigate = useNavigate();
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        setIsAutocompleteOpen(true);
      }, 250);
    }
  }, [isOpen]);

  const handleCommandSelect = (_event: SyntheticEvent, command: CommandItem | null) => {
    if (command) {
      if (command.action) {
        command.action();
      } else if (command.route) {
        navigate(command.route);
      }
      closeMenu();
    }
  };

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
      PaperProps={{
        ref: anchorRef,
        sx: {
          width: "600px",
          maxWidth: "90vw",
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          boxShadow: (theme) => `0 0 10px ${alpha(theme.palette.common.black, 0.2)}`,
          backgroundColor: (theme) => theme.palette.background.paper,
          "& .MuiAutocomplete-listbox": {
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
          },
        },
      }}
      slotProps={{
        backdrop: {
          sx: { backgroundColor: "rgba(0, 0, 0, 0.2)" },
        },
      }}
    >
      <Autocomplete
        open={isAutocompleteOpen}
        onClose={() => {
          setIsAutocompleteOpen(false);
          closeMenu();
        }}
        autoHighlight
        autoFocus
        disablePortal={false}
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
        renderOption={(props, option) => (
          <ListItem {...props}>
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
          paper: {
            sx: {
              borderTopRightRadius: 0,
              borderTopLeftRadius: 0,
            },
          },
        }}
      />
    </Popover>
  );
};

export default QuickCommandMenu;
