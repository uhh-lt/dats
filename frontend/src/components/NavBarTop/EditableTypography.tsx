import {
  IconButton,
  OutlinedInput,
  Stack,
  Typography,
  TypographyProps,
  outlinedInputClasses,
  styled,
  useTheme,
} from "@mui/material";
import { Variant } from "@mui/material/styles/createTypography";
import { FocusEventHandler, KeyboardEventHandler, useCallback, useRef, useState } from "react";
import EditIcon from "@mui/icons-material/Edit";

const CustomOutlinedInput = styled(OutlinedInput)(`
  background-color: white;
  & .${outlinedInputClasses.notchedOutline} {
    border-color: white;
  }
  &:hover .${outlinedInputClasses.notchedOutline} {
    border-color: white;
  }
  &.${outlinedInputClasses.focused} .${outlinedInputClasses.notchedOutline} {
    border-color: white;
  }
`);

interface EditableTypographyProps {
  value: string;
  onChange: (value: string) => void;
}

function EditableTypography({
  value,
  onChange,
  ...props
}: EditableTypographyProps & Omit<TypographyProps<"div">, "onChange" | "onClick" | "component">) {
  const theme = useTheme();
  const textFieldRef = useRef<HTMLDivElement>(null);

  const [text, setText] = useState(value);
  const [isEditing, setIsEditing] = useState(false);

  const handleClick = useCallback((event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (event.detail >= 2) {
      setIsEditing(true);
    }
  }, []);

  const handleChangeText: FocusEventHandler<HTMLInputElement | HTMLTextAreaElement> = useCallback(
    (event) => {
      const newValue: string = event.target.value;
      if (newValue.trim().length === 0) return;
      onChange(newValue);
      setText(newValue);
      setIsEditing(false);
    },
    [onChange]
  );

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement> = useCallback(
    (event) => {
      if (event.key === "Escape") {
        setText(value);
        setIsEditing(false);
      }
      if (event.key === "Enter") {
        onChange(text);
        setIsEditing(false);
      }
    },
    [onChange, text, value]
  );

  return (
    <Stack direction="row" alignItems="center">
      {isEditing ? (
        <CustomOutlinedInput
          value={text}
          onChange={(event) => setText(event.target.value)}
          onBlur={handleChangeText}
          onKeyDown={handleKeyDown}
          inputProps={{
            style: {
              ...(props.variant && { ...theme.typography[props.variant as Variant] }),
              padding: "8px",
            },
          }}
          autoFocus
          ref={textFieldRef}
        />
      ) : (
        <>
          <Typography {...props} color="inherit" component="div" onClick={handleClick}>
            {value}
          </Typography>
          <IconButton onClick={() => setIsEditing(true)} sx={{ ml: 1, color: "white" }}>
            <EditIcon />
          </IconButton>
        </>
      )}
    </Stack>
  );
}

export default EditableTypography;
