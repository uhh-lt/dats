import React, { useEffect, useRef, useState } from "react";

export interface CropDimensions {
  width: number;
  height?: number;
}

interface ImageCropper2Props {
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  targetSize: CropDimensions;
  style?: any;
}

const ImageCropper2 = ({ imageUrl, x, y, width, height, targetSize, style }: ImageCropper2Props) => {
  // const [croppedImage, setCroppedImage] = useState();
  const canvasRef = useRef(null);

  if (!targetSize.height) {
    targetSize.height = targetSize.width * (height / width);
  }

  // https://stackoverflow.com/questions/25753754/canvas-todataurl-security-error-the-operation-is-insecure
  useEffect(() => {
    const canvas = canvasRef.current; // document.createElement("canvas");
    if (canvas) {
      // @ts-ignore
      const context = canvas.getContext("2d");
      if (context) {
        // @ts-ignore
        canvas.width = targetSize.width;
        // @ts-ignore
        canvas.height = targetSize.height;

        const image = new Image();
        image.src = imageUrl;

        image.onload = () => {
          // Draw the cropped image on the canvas
          context.drawImage(image, x, y, width, height, 0, 0, targetSize.width, targetSize.height!);
        };

        // Convert the temporary canvas content to a data URL and set the cropped image state
        // @ts-ignore
        // setCroppedImage(canvas.toDataURL("image/webp", 1.0));
      }
    }
  }, [imageUrl, x, y, width, height, targetSize]);

  // <img src={croppedImage} style={style} alt={"BBox"} />;
  return <canvas id={"canvas"} ref={canvasRef} style={style} />;
};

export default ImageCropper2;
