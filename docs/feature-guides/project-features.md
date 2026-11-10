# Project Features

Not every project needs every DATS feature. A project that only uses the LLM Assistant on tens of thousands of documents does not need a full-text index, sentence embeddings or keyword statistics for each of them. **Project features** let you choose what DATS prepares for your documents: the fewer features you enable, the faster your uploads are processed.

Annotation, the analysis tools, the LLM Assistant, Perspectives, the Classifier, Whiteboards and the Logbook are always available. The features below can be switched on and off per project.

| Area                 | Features                                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Search               | Full-text search, Search & auto-annotate, Sentence similarity search, Image similarity search                    |
| Analysis             | RAG chat, Concepts over time, Word frequency analysis, Keyword statistics and filter, Duplicate finder           |
| Automatic annotation | Annotation scaling, Tag recommendation, Automatic entity annotations, Image captions, Automatic object detection |

Some features build on others: RAG chat, Annotation scaling and Concepts over time need **Sentence similarity search**.

## 1\. Choosing Features When Creating a Project

The **Create new project** dialog lists all features below the project name and description, grouped by area.

- **Everything** (the default) enables all features. The project behaves like every DATS project before project features existed.
- **Minimal** enables none of them. Uploads only compute what every document needs (text, sentences, thumbnails, metadata) and are processed fastest.
- Check or uncheck single features to build your own selection (shown as **Custom**). Checking a feature also checks the features it needs; unchecking a feature also unchecks the features that need it.

You can change your choice at any time later.

## 2\. The Features Tab

Open the **Project Settings** (the cog icon in the bottom left navigation bar) and select the **Features** tab. Every feature is listed with its description, its status and one action:

| Status               | Meaning                                                                                                   | Action       |
| -------------------- | --------------------------------------------------------------------------------------------------------- | ------------ |
| **Disabled**         | The feature is switched off and hidden in the project.                                                    | **Enable**   |
| **Computing**        | The feature is enabled and its data is being computed; a progress bar shows how many documents are ready. | none         |
| **Partly available** | The feature is enabled, but some documents have no data for it and nothing is computing for them.         | **Complete** |
| **Fully available**  | The feature is enabled and all documents have its data.                                                   | **Disable**  |

While a feature is computing, the tab refreshes its progress by itself, and the feature can already be used with the documents that are ready. Views of such a feature show a small "x % of documents processed" hint in the bottom right corner; click it to open the Features tab.

### Enabling and Completing a Feature

Click **Enable** (or **Complete** for a partly available feature). A dialog tells you how many documents will be processed. Use the cog button to adjust the **processing settings** (model, language, number of keywords, ...), exactly like in the [Document Upload](document-upload.md) dialog, then confirm. DATS computes the missing data in the background, with a lower priority than new uploads.

A feature becomes **partly available** when documents lack its data, for example:

- some documents failed to process (the [Health View](tools/health-view.md) shows the failed steps), or
- you imported a project or documents whose archive did not contain the data.

**Complete** computes the data for exactly these documents, including the failed ones; documents that already have the data are left alone.

### Disabling a Feature

Click **Disable** and confirm. The feature is hidden in the project and is no longer computed for new uploads. Its data is **kept**: enabling the feature again only computes the documents uploaded in the meantime.

A feature that another enabled feature needs cannot be disabled; hover over its greyed out **Disable** button to see which features need it, and disable those first.

## 3\. Opening a Disabled Feature

If you open a page of a disabled feature (for example through a link or a bookmark), DATS shows "This feature is not enabled for this project" instead. Click **Open feature settings** to go straight to the Features tab and enable it.
