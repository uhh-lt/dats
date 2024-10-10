export const downloadFile = (filePath: string, fileName: string | undefined = undefined) => {
  if (fileName === undefined) {
    fileName = filePath.split("/").pop() || "error.csv";
  }
  const a = document.createElement("a");
  a.setAttribute("download", fileName);
  a.setAttribute("href", filePath);
  a.click();
  a.remove();
};

export const exportChart = (chartIdentifier: string, chartName: string) => {
  const chartContainers = document.getElementsByClassName(chartIdentifier);
  if (chartContainers.length === 0) return;

  const chartSVG = chartContainers[0].children[0];

  const width = chartSVG.clientWidth;
  const height = chartSVG.clientHeight;
  const svgURL = new XMLSerializer().serializeToString(chartSVG);
  const svgBlob = new Blob([svgURL], { type: "image/svg+xml;charset=utf-8" });
  const URL = window.URL || window.webkitURL || window;
  const blobURL = URL.createObjectURL(svgBlob);

  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (context) {
      // Set background to white
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, context.canvas.width, context.canvas.height);
      const png = canvas.toDataURL("image/png", 1.0);

      downloadFile(png, `${chartName}.png`);
    }
  };

  image.src = blobURL;
};
