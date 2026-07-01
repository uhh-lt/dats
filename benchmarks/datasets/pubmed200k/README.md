# PubMed 200k RCT

a large dataset for sequential sentence classification

Paper: https://aclanthology.org/I17-2052.pdf
Download: https://github.com/Franck-Dernoncourt/pubmed-rct

## Setup
Run pubmed200k.iypnb to preprocess the dataset.

## What is PubMed 200k RCT

```
PubMed 200k RCT is new dataset based on PubMed for sequential sentence classification.
 The dataset consists of approximately 200,000 abstracts of randomized controlled trials, totaling 2.3 million sentences.
 Each sentence of each abstract is labeled with their role in the abstract using one of the following classes: background, objective, method, result, or conclusion.
```

## Labels

The label definitions are written by us.
Their paper does not provide any further definitions of the labels.
We use the same definitions in pubmed200k and csabstruct.

```
label_dict = {
    "background": "Provides context or previous knowledge relevant to the research topic. Think of it as setting the stage for the study.",
    "methods": "Describes the procedures and techniques used in the research. This includes the study design, data collection, and analysis methods.",
    "objective": "States the main goal or purpose of the research. What question is this work trying to answer?",
    "results": "Presents the findings or outcomes of the research. This often includes statistical data, tables, and figures.",
    "conclusions": "Summarizes the key findings of the research and draw inferences from those findings. They provide closure to the abstract, summarizing the overall contribution of the research."
}
```

{'results', 'objective', 'background', 'methods', 'conclusions'}
