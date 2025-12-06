# Tutorial: Getting Started with Geese

This tutorial will guide you through installing Geese and running your first batch automation task.

## Prerequisites

- Node.js (v16.0.0 or higher)
- An AI tool installed (by default, Geese works with `goose`, but you can configure others)

## 1. Installation

Install Geese globally using npm:

```bash
npm install -g geese
```

Verify the installation:

```bash
geese --version
```

## 2. Initialize a Project

Navigate to your project folder (or create a new test folder):

```bash
mkdir my-geese-project
cd my-geese-project
```

Initialize a local configuration for this project. This allows you to have project-specific settings that override global defaults.

```bash
geese config --set defaultTool "goose"
```

## 3. Create Your First Geese File

Geese uses `.geese` files to define tasks. Let's create a simple task to review code.

Run the `new` command to generate a template:

```bash
geese new code-review
```

This creates a file named `.geese/code-review.geese`. Open it in your editor. It should look something like this:

```yaml
---
_include:
  - "src/**/*.js"
_exclude:
  - "*.test.js"
_recipe: "code-review"
project_name: "My Project"
focus: "clean code"
---

Review the following file from {{project_name}}.
Focus on: {{focus}}.

File: {{filename}}
{{content}}
```

## 4. Customize the Task

Let's create a dummy source file to process. Create `src/hello.js`:

```bash
mkdir src
echo "console.log('hello world');" > src/hello.js
```

Now, we can customize the `.geese/code-review.geese` file to be more specific if we want, but the default template works.

## 5. Run the Task

Run Geese from the root of your project:

```bash
geese
```

Geese will:
1.  Scan for `.geese` files.
2.  Ask you which task to run (select `code-review.geese`).
3.  Find all files matching `src/**/*.js` (excluding tests).
4.  Generate a prompt for each file using the template.
5.  Send the prompts to the configured AI tool.
6.  Generate a Markdown report in the `logs/` directory.

## 6. View the Results

Check the output in the terminal. You should see a path to a log file, for example:

```
Report generated: logs/geese_session_2023-10-27T10-00-00.log.md
```

Open that file to see the AI's response to your code.

## Next Steps

Now that you've run your first task, try:
- [Creating Templates](creating-templates.md) to learn about the file format.
- [Configuration](../how-to/manage-configuration.md) to set up different AI models.
