---
title: "Core Concepts"
nextjs:
  metadata:
    title: "Core Concepts"
    description: "Documentation for Core Concepts"
---

## Batch Prompt Engineering

Geese introduces the concept of **Batch Prompt Engineering**.

Traditional AI coding assistants work on one problem at a time ("Fix this bug in file X"). Geese allows you to define a **pattern** of work ("Fix this class of bugs in *all* files matching Y").

This shifts the workflow from:
1.  Open file.
2.  Copy code.
3.  Paste to AI.
4.  Wait.
5.  Repeat.

To:
1.  Define the prompt template once.
2.  Define the file pattern (`src/**/*.js`).
3.  Run for all files.

## The Pipe Operator (`~>`)

Geese borrows the pipe operator concept from Unix (`|`) and Elixir (`|>`). It allows for a linear, readable flow of data transformation.

```
"data" ~> transform1 ~> transform2
```

In the context of prompt engineering, this is powerful for preparing context. You don't just dump raw files; you can:
*   Extract specific lines (grep).
*   Parse JSON/XML.
*   Format data for better AI comprehension.

## Runners as Abstractions

Geese is **tool-agnostic**. While it comes with defaults for `goose`, it doesn't care *what* AI tool processes the prompt.

A "Runner" is simply an abstraction that knows:
1.  How to launch a CLI tool.
2.  How to feed it a prompt.

This means Geese is future-proof. As new AI CLI tools emerge (Claude, OpenAI CLI, etc.), you only need a thin adapter (Runner) to use Geese's batch processing power with them.