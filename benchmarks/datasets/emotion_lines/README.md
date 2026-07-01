# Emotion Lines Dataset

Paper: https://aclanthology.org/L18-1252/
Download: https://doraemon.iis.sinica.edu.tw/emotionlines/download.html

## Setup
Run emotion_lines.iypnb to preprocess the dataset.

## What is EmotionLines?
```
We introduce EmotionLines, the first dataset with emotions labeling on all utterances in each dialogue only based on their textual content.
Dialogues in EmotionLines are collected from Friends TV scripts and private Facebook messenger dialogues.
Then one of seven emotions, six Ekman’s basic emotions plus the neutral emotion, is labeled on each utterance by 5 Amazon MTurkers.
A total of 29,245 utterances from 2,000 dialogues are labeled in EmotionLines
```

## Labels
The labels follow the BigSix Theory by Paul Ekman 1992 - An argument for basic emotions. Cognition & emotion

Labels: neutral, joy, sadness, fear, anger, surprise, disgust, (non-neutral)

non-neutral: Each HIT was accomplished by 5 workers, and for each utterance in a HIT, the emotion with the highest number of votes was set as the gold label of the utterance. Those utterances with more than two different emotions voted were put into the non-neutral category.

```
{'fear': 'A feeling of apprehension or dread in response to a perceived threat or danger. It can range from mild anxiety to intense terror.',
 'disgust': 'A feeling of revulsion or aversion, often triggered by something perceived as unpleasant, unsanitary, or morally offensive.',
 'neutral': 'A state of emotional balance or equilibrium, where no particular emotion is dominant.',
 'anger': 'A feeling of intense displeasure or hostility, often triggered by a perceived wrong or injustice. It can manifest as irritation, frustration, rage, or fury.',
 'surprise': 'A brief emotional state in response to an unexpected event. It can be positive, negative, or neutral, depending on the nature of the surprise.',
 'sadness': 'A feeling of sorrow, grief, or disappointment. It can range from mild melancholy to intense despair.',
 'joy': 'A feeling of happiness, contentment, or pleasure. It can manifest as excitement, amusement, or love.',
 'non-neutral': 'Use this label if other or multiple of the above emotions are present'
 }
```

{'surprise', 'sadness', 'fear', 'disgust', 'neutral', 'anger', 'non-neutral', 'joy'}

## Evaluation
Chosen labels: joy, sadness, anger, and neutral.
non-neutral will be ignored
