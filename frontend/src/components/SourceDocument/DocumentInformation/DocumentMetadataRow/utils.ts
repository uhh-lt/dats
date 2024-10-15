export const isValidHttpUrl = (string: string) => {
  let url;

  try {
    url = new URL(string);
  } catch (e) {
    console.error(e);
    return false;
  }

  return url.protocol === "http:" || url.protocol === "https:";
};
