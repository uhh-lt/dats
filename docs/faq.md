# Frequently Asked Questions (FAQ)

Welcome to the DATS FAQ. Here you will find answers to the most common questions regarding data privacy, supported formats, technical requirements, and troubleshooting.

*(Note: This section is continuously updated. If you cannot find the answer to your question here, please see the "Getting Help" section at the bottom of this page).*

## General & Data Privacy

### Is my sensitive research data safe? Does DATS send my texts to OpenAI or Google?

**No.** DATS is built with a strict "privacy by design" philosophy, specifically to handle sensitive academic research data.

Unlike commercial qualitative tools that rely on third-party cloud APIs (like ChatGPT or Google Cloud), **DATS executes all machine learning models locally on the host server**.

The LLM Assistant, Whisper transcription, and all other NLP pipelines use open-weight models (like Gemma or Llama) hosted directly within the DATS infrastructure. Your data never leaves the controlled environment.

### Do I need to install software on my computer to use DATS?

If you are using a hosted instance (like our demo server or a server provided by your university), **no installation is required**. DATS is a modern web application accessed entirely through your web browser (Google Chrome or Mozilla Firefox are recommended).

If you are an IT administrator wishing to self-host the platform for your institute, you will need to deploy it using Docker. (See our [GitHub Admin Guide](https://github.com/uhh-lt/dats) for deployment instructions).

## Data Import & Formats

### What file formats can I upload to DATS?

DATS supports a wide variety of multimodal formats:

* **Text/Documents:** .pdf, .docx, .txt, .html
* **Images:** .png, .jpg, .jpeg
* **Audio:** .mp3, .wav
* **Video:** .mp4, .mov
* **Archives:** .zip (containing any of the supported formats above)

### What languages are supported by the automatic NLP pipeline?

DATS can store and search documents in any language. However, the advanced Natural Language Processing pipeline (which handles tokenization, sentence segmentation, and Named Entity Recognition via spaCy) currently fully supports **English**, **German**, and **Italian**.

## Troubleshooting & Getting Help

### A document failed to process during upload. What should I do?

Occasionally, a PDF might be corrupted or a web scraper might be blocked. You do not need to re-upload the file.

1. Go to **Tools \> Document Health** in the left navigation bar.
2. Find the failed document (it will have a red error icon).
3. Select the document using the checkbox and click **Retry** at the top of the table.

### How do I report a bug or request a new feature?

DATS is an actively developed, open-source project, and we highly value user feedback\!

* **To report a bug or request a feature:** Please open an issue on our [official GitHub Repository](https://github.com/uhh-lt/dats/issues).
* **For general feedback:** You can contact the lead developers directly [here](https://www.inf.uni-hamburg.de/en/inst/ab/lt/people/tim-fischer.html).

## \[Placeholder: Future Questions\]

*(This space is reserved for future questions regarding specific methodological workflows, advanced error codes, or user management. To be expanded as new materials and user feedback are gathered\!)*
