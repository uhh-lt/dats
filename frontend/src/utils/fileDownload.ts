export const downloadFile = (filePath: string, fileName: string) => {
  const a = document.createElement("a");
  a.setAttribute("download", fileName);
  a.setAttribute("href", filePath);
  a.click();
  a.remove();
};
