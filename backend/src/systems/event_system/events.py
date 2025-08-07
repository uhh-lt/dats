from blinker import signal

# sends project_id: int
project_created = signal("project_created")

# sends project_id: int
project_deleted = signal("project_deleted")

# sends project_id: int, sdoc_id: int
source_document_deleted = signal("source_document_deleted")

# sends project_id: int, user_id: int
user_added_to_project = signal("user_added_to_project")

# sends job_type: str, input: JobInputBase, output: BaseModel | None
job_finished = signal("job_finished")
