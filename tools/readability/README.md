# Readability Python WrapperWrapper for Python
This tool is a simple python wrapper for the Javascript / Node tool Readability.

The wrapper works by automatically starting a simple express server serving the Readability API. Then, the API can be
called with a normal python function.

## Requirements
- Python
- Node

## Installation
```
npm install
```

## Usage
```
from readability.readability import Readability

api = Readability(port=14149)
res = api.parse(html="<html><body><h1>Test</h1><p>This is test data!</p></body></html>")
```
