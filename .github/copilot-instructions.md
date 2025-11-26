# Project Overview

This project is a web application that allows users to manage, search, annotate, analyze and interprete reseach materials.

## Folder Structure

- `/frontend`: Contains the source code for the frontend.
- `/backend`: Contains the source code for the backend.
- `/docker`: Contains docker configurations.
- `/tools`: Contains various scripts.

## Core Concepts

We use the following terms throughout the project:

- **User**: An individual who uses the application.
- **Project**: A collection of source documents, annotations, codes, tags, and memos related to a specific research endeavor.
- **Source Document**: Any document (text, image, audio, video) data that is being analyzed. Short: "sdoc".
- **Metadata**: Information about a source document, such as title, author, date created, etc.
- **Tag**: A label assigned to a source document for categorization.
- **Code**: A category used for annotating source documents.
- **Annotation**: A segment of a source document that has been assigned a code.
  - **Span Annotation**: An annotation that applies to a specific span of text within a source document.
  - **Sentence Annotation**: An annotation that applies to an entire sentence within a source document.
  - **Bbox Annotation**: An annotation that applies to a bounding box within an image document.
- **Memo**: A note or comment added to a source document or annotation.
