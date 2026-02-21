import EditIcon from "@mui/icons-material/Edit";
import {
  IconButton,
  OutlinedInput,
  Stack,
  StackProps,
  Typography,
  TypographyProps,
  outlinedInputClasses,
  styled,
  useTheme,
} from "@mui/material";
import { Variant } from "@mui/material/styles/createTypography";
import { FocusEventHandler, KeyboardEventHandler, useCallback, useRef, useState } from "react";

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
  whiteColor: boolean;
  stackProps?: Omit<StackProps, "direction" | "alignItems">;
}

export function EditableTypography({
  value,
  onChange,
  whiteColor,
  stackProps,
  ...props
}: EditableTypographyProps & Omit<TypographyProps<"div">, "onChange" | "onClick" | "component">) {
  const theme = useTheme();
  const textFieldRef = useRef<HTMLDivElement>(null);
  const InputComponent = whiteColor ? CustomOutlinedInput : OutlinedInput;

  const [text, setText] = useState(value);
  const [isEditing, setIsEditing] = useState(false);

  const handleClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleChangeText: FocusEventHandler<HTMLInputElement | HTMLTextAreaElement> = useCallback(
    (event) => {
      const newValue: string = event.target.value;
      if (newValue.trim().length === 0) return;
      onChange(newValue);
      setText(newValue);
      setIsEditing(false);
    },
    [onChange],
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
    [onChange, text, value],
  );

  return (
    <Stack direction="row" alignItems="center" {...stackProps}>
      {isEditing ? (
        <InputComponent
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
          <Typography {...props} component="div" onClick={handleClick}>
            {value}
          </Typography>
          <IconButton
            onClick={() => setIsEditing(true)}
            sx={{ ml: 1, color: whiteColor ? "white" : null }}
            size="small"
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </>
      )}
    </Stack>
  );
}
