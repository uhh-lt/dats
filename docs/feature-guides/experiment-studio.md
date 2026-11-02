# Experiment Studio

The **Experiment Studio** compares LLM runs on a small, fixed set of documents. A **run** is one [prompt](prompts.md) version with one model; every run is evaluated automatically against a **gold annotator**, so you can see whether a change helped (e.g. "the F1 of code X went from 0.42 to 0.61"). Everything that is experimented with lives in the prompt version: the text, the code definitions, the few-shot examples and the settings.

Open the **Experiment Studio** from the project sidebar (the flask icon). All project members see and work on all experiments of the project. The table lists the experiments with their task and the best F1 of their runs (per word / sentence); its actions open, rename and delete an experiment.

Renaming an experiment renames the virtual users of its runs. Deleting it deletes all its runs with their virtual users and annotations. Only the experiment renames and deletes these virtual users: the [virtual users tab](project-view.md#virtual-users-tab) of the project settings shows their run and links to the experiment.

## Experiments

An **experiment** is a name, a list of documents, a set of codes, a task (span or sentence annotation) and a gold annotator. **Create New Experiment** opens a wizard with three steps:

1. **Settings:**
   - **Name**, e.g. the stage or case study ("ClaimsStage1"), unique per project. The virtual users of its runs are named after it.
   - **Task:** span or sentence annotation.
   - **Gold annotator:** any annotator of the project, a person or a virtual user, e.g. one holding a group standard.
2. **Select codes:** the project codes the runs annotate. Only prompt versions that select exactly these codes can run.
3. **Select documents:** select them in the document table with the usual filters and search; the header checkbox selects all loaded documents. The experiment stores the selected documents, so later tag changes do not change it.

Every document must be annotated by the gold annotator, as the **Annotated by** filter defines it. **Filter by gold annotator** adds this filter to the table.

The documents, codes, task and gold annotator are fixed when the experiment is created; to change them, create a new experiment. Only the name can change. The page of an experiment shows them in its header, next to its name.

The gold annotator stays live: its annotations can still change, and the stored scores are only updated when you refresh them. If the gold annotator is deleted (a virtual user deleted in the project settings, or a person deleting their account), the experiment keeps its runs and their stored scores. Its page then shows that the gold annotator was deleted, and new runs and refreshing the scores are disabled.

## Runs

**Start new run** in the runs table asks for a name, a prompt version and a model. The run name is unique per experiment, e.g. "Zero-shot" or "Few-shot Gemma". The selector only offers versions of the experiment's task whose codes are exactly the experiment's codes; archived prompts are not offered. Each run:

- writes its annotations into its own new [virtual user](project-view.md#virtual-users-tab) `<experiment name>-<run name>`, e.g. `ClaimsStage1-Zero-shot`. Virtual user names are unique per project, so a run cannot start (and an experiment cannot be renamed) while another virtual user has that name;
- stores the documents it ran on;
- runs the LLM Assistant job of the prompt's task;
- stores its agreement with the gold annotator (see [Annotator Agreement](analysis/annotator-agreement.md)) when it finishes, for both scorings, with the time it was computed.

The runs table shows all runs side by side: run name, prompt and version, model, status (queued, started, finished or failed), the overall precision, recall and F1 and the start time. Hover an F1 for its precision, recall and counts. More columns can be shown with the column button: the F1 of every code, the virtual user, who started the run, the end time, the last update and when the scores were computed. The toolbar also searches the runs, filters every column (the status by value, the scores by a range) and changes the density. The **Scoring** selector above the table switches between **Per word** (**Per sentence** for sentence annotation) and **Exact boundaries**; its menu explains both. Click the prompt of a run to open the prompt editor at the version the run used. **Refresh all runs** next to **Start new run** recomputes the stored scores of all finished runs at once, so all runs are scored against the same state of the gold annotator.

The actions of a run:

- **Agreement evaluation** opens the [Annotator Agreement](analysis/annotator-agreement.md) analysis with the gold annotator, the run's virtual user, the experiment's codes and the run's documents preselected.
- **Recompute the scores** refreshes the stored agreement of this run, e.g. after the gold annotator changed annotations. To compare runs side by side, prefer **Refresh all runs**.
- **Download the run log** exports it as JSON or CSV: experiment, run name, virtual user, prompt name, the version with its full content (text, codes, tags, metadata fields, examples, settings), model, documents, user, start and end time and the stored scores. The CSV has one row per stored score (all codes and every code, for each scoring). The export is also available through the API (`POST /experiment/run/{run_id}/export_log`).
- **Open all comparison views** opens the comparison view of the gold annotator and the run in one tab per document.
- **Delete** deletes the run's virtual user with all its annotations.

Click a run to expand its documents; **Compare** opens the comparison view of the gold annotator and the run for one document.

Virtual users of runs are ordinary annotators: they appear in the annotator filters, the comparison view and the agreement analysis like any other annotator.

## Export and import

The full project export ([Data Export & Import](export-import.md)) contains the experiments with their runs, and the project import restores them, so that a moved or restored project keeps its experiments, their runs and the stored scores without running them again. The export references documents by filename, codes by name, users (incl. the gold annotator and the virtual users of the runs) by email and the prompt version of a run by prompt name and version number. The import:

- runs after the users, codes, documents, annotations and prompts; a run uses the version of its number of the prompt of its name, or of the prompt the prompt import imported it as because it differs from the project's prompt of that name ("<name> (imported)"): the one whose version selects exactly the experiment's codes. A run for which several of these prompts fit is skipped with a warning;
- skips an experiment whose documents, codes or gold annotator do not exist in the project, and a run whose prompt version, documents or virtual user do not exist, each with a warning in the import log;
- adds the runs an experiment of the same name (with the same task, documents, codes and gold annotator) lacks and keeps its runs as they are, so importing the same export twice changes nothing;
- imports a run that was queued or running at the export as failed, because its job does not exist in the project.
