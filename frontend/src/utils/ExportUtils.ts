export const downloadFile = async (filePath: string, fileName: string | undefined = undefined) => {
  if (fileName === undefined) {
    fileName = filePath.split("/").pop() || "error.csv";
  }

  try {
    // Use fetch with credentials to ensure cookies are sent
    const response = await fetch(filePath, {
      credentials: "include", // This ensures cookies are sent with the request
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // Get the file as a blob
    const blob = await response.blob();

    // Create a URL for the blob
    const url = window.URL.createObjectURL(blob);

    // Create and click a download link
    const a = document.createElement("a");
    a.setAttribute("download", fileName);
    a.setAttribute("href", url);
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();

    // Clean up
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error("Download failed:", error);
  }
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
