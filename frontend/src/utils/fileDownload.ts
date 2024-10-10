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
