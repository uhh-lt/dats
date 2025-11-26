from blinker import signal

# sends project_id: int, sdoc_id: int
source_document_deleted = signal("source_document_deleted")
