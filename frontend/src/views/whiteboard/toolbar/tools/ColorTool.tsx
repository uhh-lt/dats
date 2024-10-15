import { OutlinedInput } from "@mui/material";

interface ColorToolProps {
  caption: string | undefined;
  color: string | undefined;
  onColorChange: (color: string) => void;
}

function ColorTool({ caption, color, onColorChange }: ColorToolProps) {
  let timeout: NodeJS.Timeout | undefined;
  const handleColorChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      const color = event.target.value;
      onColorChange(color);
    }, 333);
  };

  return (
    <>
      {caption}
      <OutlinedInput
        sx={{ bgcolor: "background.paper", p: 0, ml: caption ? 0.5 : undefined, mr: 1 }}
        type="color"
        onChange={handleColorChange}
        defaultValue={color}
        inputProps={{
          style: {
            padding: "1.5px 3px",
            height: "28px",
            width: "28px",
          },
        }}
      />
    </>
  );
}

export default ColorTool;
