import { memo, useEffect, useRef } from "react";

interface ImageCropperProps {
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  targetWidth: number;
  targetHeight: number;
  style?: any;
}

const ImageCropper = memo(({ imageUrl, x, y, width, height, targetWidth, targetHeight, style }: ImageCropperProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // https://stackoverflow.com/questions/25753754/canvas-todataurl-security-error-the-operation-is-insecure
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const context = canvas.getContext("2d");
      if (context) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const image = new Image();
        image.src = imageUrl;

        image.onload = () => {
          // Draw the cropped image on the canvas
          context.drawImage(image, x, y, width, height, 0, 0, targetWidth, targetHeight!);
        };
      }
    }
  }, [imageUrl, x, y, width, height, targetHeight, targetWidth]);

  // <img src={croppedImage} style={style} alt={"BBox"} />;
  return <canvas id={"canvas"} ref={canvasRef} style={style} />;
});

export default ImageCropper;
