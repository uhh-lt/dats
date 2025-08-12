import pendulum
from airflow.sdk import dag, task


@dag(
    schedule=None,
    start_date=pendulum.datetime(2021, 1, 1, tz="UTC"),
    catchup=False,
    tags=["preprocessing"],
)
def text_processing_dag():
    """
    ### TaskFlow API Tutorial Documentation
    This is a simple data pipeline example which demonstrates the use of
    the TaskFlow API using three simple tasks for Extract, Transform, and Load.
    Documentation that goes along with the Airflow TaskFlow API tutorial is
    located
    [here](https://airflow.apache.org/docs/apache-airflow/stable/tutorial_taskflow_api.html)
    """

    @task.external_python(
        task_id="create_project", python="/dats_code/dats-venv/bin/python"
    )
    def create_project() -> int:
        from modules.doc_text_processing.example_text_processing_task import (
            create_project_task,
        )

        return create_project_task()

    @task()
    def print_project(project_id: int):
        """
        #### Print Project task
        A simple Load task which takes in the result of the Transform task and
        instead of saving it to end user review, just prints it out.
        """

        print(f"A project was recently created! The id is {project_id}.")

    project_id = create_project()
    print_project(project_id=project_id)  # pyright: ignore[reportArgumentType]


text_processing_dag()
