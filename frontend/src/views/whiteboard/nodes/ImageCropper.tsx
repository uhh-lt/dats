import React from "react";
import { Box } from "@mui/material";
import { SourceDocumentMetadataRead } from "../../../api/openapi";
import { add } from "lodash";

interface ImageCropperProps {
  imageUrl: string;
  topLeftX: number;
  topLeftY: number;
  bottomRightX: number;
  bottomRightY: number;
  additionalStyle?: any;
}

const ImageCropper = ({
  imageUrl,
  topLeftX,
  topLeftY,
  bottomRightX,
  bottomRightY,
  additionalStyle,
}: ImageCropperProps) => {
  if (!additionalStyle) {
    additionalStyle = {};
  }

  const imageWidth = bottomRightX - topLeftX;
  const imageHeight = bottomRightY - topLeftY;
  const aspectRatio = imageWidth / imageHeight;
  let croppedHeight = imageHeight;
  if (additionalStyle.width !== undefined) {
    croppedHeight = additionalStyle.width / aspectRatio;
  }

  const imageStyle = {
    backgroundImage: `url(${imageUrl})`,
    backgroundPosition: `-${topLeftX}px -${topLeftY}px`,
    backgroundRepeat: "no-repeat",
    height: `${croppedHeight}px`,
    ...additionalStyle,
  };

  return <Box className="image-cropper" sx={imageStyle}></Box>;
};

export default ImageCropper;
