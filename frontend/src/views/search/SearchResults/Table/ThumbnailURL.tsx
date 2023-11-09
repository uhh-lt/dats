import SdocHooks from "../../../../api/SdocHooks";

function ThumbnailURL({ sdocId }: { sdocId: number }) {
  const thumbnailUrl = SdocHooks.useGetThumbnailURL(sdocId);

  if (thumbnailUrl.data) {
    return <>{thumbnailUrl.data}</>;
  } else if (thumbnailUrl.isLoading) {
    return <>Loading!</>;
  } else if (thumbnailUrl.isError) {
    return <>Error! {thumbnailUrl.error.message}</>;
  } else {
    return <>Something went wrong!</>;
  }
}

export default ThumbnailURL;
