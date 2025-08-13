class NoDataToCrawlError(Exception):
    def __init__(self, what_msg: str):
        super().__init__(what_msg)
