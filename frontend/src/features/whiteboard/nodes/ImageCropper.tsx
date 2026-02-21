import { Box, BoxProps } from "@mui/material";
import { memo, useEffect, useRef } from "react";

interface ImageCropperProps extends BoxProps {
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  targetWidth?: number;
  targetHeight?: number;
}

export const ImageCropper = memo((
  {
    imageUrl,
    x,
    y,
    width,
    height,
    targetWidth = width,
    targetHeight = height,
    ...props
  }: ImageCropperProps
) => {
  const img = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (img.current) {
      img.current.style.objectPosition = `-${x}px -${y}px`;
    }
  }, [x, y]);

  return (
    <Box
      {...props}
      component="div"
      style={{
        width: targetWidth,
        height: targetHeight,
        overflow: "hidden",
        display: "inline-block",
        ...props.style,
      }}
    >
      <img
        ref={img}
        src={imageUrl}
        style={{
          objectFit: "none",
          transform: `scale(${targetWidth / width}, ${targetHeight / height})`,
          transformOrigin: "0 0",
        }}
      />
    </Box>
  );
});
