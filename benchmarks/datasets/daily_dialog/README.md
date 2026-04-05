# Daily Dialog Dataset

Paper: https://aclanthology.org/I17-1099/
Blog: http://yanran.li/dailydialog
Download: https://github.com/declare-lab/RECCON/tree/main/data/original_annotation

## Setup
Run dailydialog.iypnb to preprocess the dataset.

## What is Daily Dialog Dataset

```
Daily Topics: It covers ten categories ranging from ordinary life to financial topics, which is different from domain-specific datasets.

Bi-turn Dialog Flow: It conforms basic dialog act flows, such as Questions-Inform and Directives-Commissives bi-turn flows, making it different from question answering (QA) datasets and post-reply datasets.

Certain Communication Pattern: It follows unique multi-turn dialog flow patterns reflecting human communication style, which are rarely seen in task-oriented datasets.

RichEmotion: It contains rich emotions and is labeled manually to keep high-quality, which is distinguished from most existing dialog datasets.
```

## Statistics

            Count   ofEU    ofTotal

Anger 1022 5.87 0.99
Disgust 353 2.03 0.34
Fear 74 1.00 0.17
Happiness 12885 74.02 12.51
Sadness 1150 6.61 1.12
Surpise 1823 10.47 1.77
Other 85572 - 83.10

## Labels

The labels follow the BigSix Theory by Paul Ekman 1992 - An argument for basic emotions.
The label definitions are written by us as the authors do not provide further details or descriptions.
We use the same definitions in dailydialog and emotion_lines.

```
{'fear': 'A feeling of apprehension or dread in response to a perceived threat or danger. It can range from mild anxiety to intense terror.',
 'disgust': 'A feeling of revulsion or aversion, often triggered by something perceived as unpleasant, unsanitary, or morally offensive.',
 'neutral': 'A state of emotional balance or equilibrium, where no particular emotion is dominant.',
 'anger': 'A feeling of intense displeasure or hostility, often triggered by a perceived wrong or injustice. It can manifest as irritation, frustration, rage, or fury.',
 'surprise': 'A brief emotional state in response to an unexpected event. It can be positive, negative, or neutral, depending on the nature of the surprise.',
 'sadness': 'A feeling of sorrow, grief, or disappointment. It can range from mild melancholy to intense despair.',
 'joy': 'A feeling of happiness, contentment, or pleasure. It can manifest as excitement, amusement or love.'}
```

{'fear', 'disgust', 'neutral', 'anger', 'surprise', 'sadness', 'joy'}

## Evaluation

Chosen labels: ?
