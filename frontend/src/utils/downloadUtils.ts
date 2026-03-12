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
