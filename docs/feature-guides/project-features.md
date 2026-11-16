# Project Features

Not every project needs every DATS feature. A project that only uses the LLM Assistant on tens of thousands of documents does not need sentence embeddings or keyword statistics for each of them. **Project features** let you choose what DATS prepares for your documents: the fewer features you enable, the faster your uploads are processed.

Annotation, document search (full-text search included), Search & Auto-Annotate, the analysis tools, the LLM Assistant, Perspectives, the Classifier, Whiteboards and the Logbook are always available. The features below can be switched on and off per project: each of them computes extra data for every document.

| Area                 | Features                                                                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Search               | Semantic Search (Sentence Search and Image Search)                                                                                             |
| Analysis             | RAG Chat, Concepts Over Time Analysis, Word Frequency Analysis, Keyword Statistics and Filter, Duplicate Finder                                |
| Automatic Annotation | Annotation Scaling, Tag Recommendations, Automatic Entity Annotations, Automatic Object Detection, Coreference Resolution, Quotation Detection |

Every feature stands on its own: enabling or disabling one never changes another. Several features may share data: Semantic Search, RAG Chat, Annotation Scaling and Concepts Over Time Analysis all use the sentence embeddings, which are computed once.

**Coreference Resolution** and **Quotation Detection** annotate German text documents (mention groups; quotations with their speaker, cue, addressee and frame). They run a hosted model for every German text document, so a new project leaves them off until you enable them. Documents in other languages finish without annotations. They replace the former ML Automation page: you no longer start them by hand for the whole project, the pipeline computes them for every German text document of a project that enables them, and Recompute in the document health view runs them again.

## 1\. Choosing Features When Creating a Project

The **Create new project** dialog lists all features below the project name and description, grouped by area.

- The dialog preselects the features that are on by default: every feature except Coreference Resolution and Quotation Detection.
- **Everything** enables all features, the two above included.
- **Minimal** enables none of them. Uploads only compute what every document needs (text, sentences, image captions, thumbnails, metadata) and are processed fastest.
- Check or uncheck single features to build your own selection (shown as **Custom**).

You can change your choice at any time later.

## 2\. The Features Tab

Open the **Project Settings** (the cog icon in the bottom left navigation bar) and select the **Features** tab. Every feature is listed with its description, its status and the actions its status allows:

| Status               | Meaning                                                                                                   | Actions                   |
| -------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------- |
| **Disabled**         | The feature is switched off and hidden in the project.                                                    | **Enable**                |
| **Computing**        | The feature is enabled and its data is being computed; a progress bar shows how many documents are ready. | none                      |
| **Partly available** | The feature is enabled, but some documents have no data for it and nothing is computing for them.         | **Complete**, **Disable** |
| **Fully available**  | The feature is enabled and all documents have its data.                                                   | **Disable**               |

While a feature is computing, DATS refreshes its progress by itself, and the feature can already be used with the documents that are ready. It offers no action until it stops computing: then it is fully available, or partly available if some documents failed. Views of such a feature (and of a partly available one) show a small hint such as "Semantic Search: 60 % of documents" in the bottom right corner; click it to open the Features tab.

### Enabling and Completing a Feature

Click **Enable** (or **Complete** for a partly available feature). A dialog tells you how many documents will be processed. Use the cog button to adjust the **processing settings** (model, language, number of keywords, ...), exactly like in the [Document Upload](document-upload.md) dialog, then confirm. DATS computes the missing data in the background, with a lower priority than new uploads. Features that use the same data, such as Word Frequency Analysis and the Duplicate Finder, are computing together while it is computed.

A feature becomes **partly available** when documents lack its data, for example:

- some documents failed to process (the [Health View](tools/health-view.md) shows the failed steps), or
- you imported a project or documents whose archive did not contain the data.

**Complete** computes the data for exactly these documents, including the failed ones; documents that already have the data are left alone.

Whatever goes wrong while a document is computed (a processing error, a server or worker that stops, a queue that cannot be reached), its step is marked as failed. **Complete** computes the failed steps again.

If documents failed, the feature shows **Open Document Health** next to the failed count. It opens the [Health View](tools/health-view.md), where you select the failed documents (in the tab of their document type) and **Recompute** the failed steps. Once they succeed, the feature is **fully available**.

### A Feature That Stays Computing

If a worker stops while it computes a document, DATS notices it after the job's time limit (about an hour) and marks the step as failed; the feature then becomes partly available and you can **Complete** it. In rare cases (the server stops at the very moment it starts a step) a document stays processing; select it in the [Health View](tools/health-view.md) and **Recompute** the step.

### Disabling a Feature

A partly or fully available feature can be disabled. Click **Disable** and confirm. The feature is hidden in the project and is no longer computed for new uploads. Its data is **kept**: enabling the feature again only computes the documents that lack it.

Disabling a feature never disables another one. Data that another enabled feature also uses (the sentence embeddings, for example) is still computed for new uploads.

### Importing a Project

A project archive is imported into an existing project (**Project Settings** → **Import**). The import only ever adds features: afterwards the project enables its own features plus the features of the exported project. It never disables a feature and never starts processing. If the archive lacks the data of an enabled feature, the feature is partly available until you click **Complete**. This also holds for documents that were still being processed when the project was exported: their unfinished data is not imported. To get exactly the features of the exported project, create the target project with **Minimal**.

Archives exported with a DATS version before project features cannot be imported: they do not say which processing steps of their documents finished.

## 3\. Opening a Disabled Feature

If you open a page of a disabled feature (for example through a link or a bookmark), DATS shows "This feature is not enabled for this project" instead. Click **Open feature settings** to go straight to the Features tab and enable it.
