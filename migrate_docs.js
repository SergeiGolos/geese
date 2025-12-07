const fs = require('fs');
const path = require('path');

const mappings = [
  // Tutorials
  { src: 'docs/tutorials/getting-started.md', dest: 'syntax-ts/src/app/docs/tutorials/getting-started/page.md', title: 'Getting Started' },
  { src: 'docs/tutorials/creating-templates.md', dest: 'syntax-ts/src/app/docs/tutorials/creating-templates/page.md', title: 'Creating Templates' },

  // How-To
  { src: 'docs/how-to/manage-configuration.md', dest: 'syntax-ts/src/app/docs/how-to/manage-configuration/page.md', title: 'Manage Configuration' },
  { src: 'docs/how-to/integrate-ai-tools.md', dest: 'syntax-ts/src/app/docs/how-to/integrate-ai-tools/page.md', title: 'Integrate AI Tools' },
  { src: 'docs/how-to/create-custom-pipes.md', dest: 'syntax-ts/src/app/docs/how-to/create-custom-pipes/page.md', title: 'Create Custom Pipes' },
  { src: 'docs/how-to/troubleshoot.md', dest: 'syntax-ts/src/app/docs/how-to/troubleshoot/page.md', title: 'Troubleshoot' },

  // Reference
  { src: 'docs/reference/cli.md', dest: 'syntax-ts/src/app/docs/reference/cli/page.md', title: 'CLI Reference' },
  { src: 'docs/reference/file-format.md', dest: 'syntax-ts/src/app/docs/reference/file-format/page.md', title: 'File Format' },
  { src: 'docs/reference/config-settings.md', dest: 'syntax-ts/src/app/docs/reference/config-settings/page.md', title: 'Config Settings' },
  { src: 'docs/reference/pipes-library.md', dest: 'syntax-ts/src/app/docs/reference/pipes-library/page.md', title: 'Pipes Library' },
  { src: 'docs/features/pipe-operations.md', dest: 'syntax-ts/src/app/docs/reference/pipe-operations/page.md', title: 'Pipe Operations' },


  // Explanation
  { src: 'docs/explanation/core-concepts.md', dest: 'syntax-ts/src/app/docs/explanation/core-concepts/page.md', title: 'Core Concepts' },
  { src: 'docs/explanation/architecture.md', dest: 'syntax-ts/src/app/docs/explanation/architecture/page.md', title: 'Architecture' },
  { src: 'docs/explanation/security-model.md', dest: 'syntax-ts/src/app/docs/explanation/security-model/page.md', title: 'Security Model' },
  { src: 'docs/features/FEATURES_OVERVIEW.md', dest: 'syntax-ts/src/app/docs/explanation/features-overview/page.md', title: 'Features Overview' },
  { src: 'docs/features/configuration-and-pipe-inheritance.md', dest: 'syntax-ts/src/app/docs/explanation/configuration-inheritance/page.md', title: 'Configuration Inheritance' },


  // Contributing
  { src: 'docs/DEVELOPMENT.md', dest: 'syntax-ts/src/app/docs/contributing/development/page.md', title: 'Development Guide' },
  { src: 'docs/TESTING_GUIDE.md', dest: 'syntax-ts/src/app/docs/contributing/testing/page.md', title: 'Testing Guide' },

  // ADRs
  { src: 'docs/adr/README.md', dest: 'syntax-ts/src/app/docs/architecture/adr/page.md', title: 'Architecture Decision Records' },
  { src: 'docs/adr/ADR-001-interface-based-architecture.md', dest: 'syntax-ts/src/app/docs/architecture/adr/001-interface-based-architecture/page.md', title: 'ADR 001: Interface Based Architecture' },
  { src: 'docs/adr/ADR-002-dependency-injection-container.md', dest: 'syntax-ts/src/app/docs/architecture/adr/002-dependency-injection-container/page.md', title: 'ADR 002: DI Container' },
  { src: 'docs/adr/ADR-003-event-driven-cross-cutting-concerns.md', dest: 'syntax-ts/src/app/docs/architecture/adr/003-event-driven-cross-cutting-concerns/page.md', title: 'ADR 003: Event Driven Architecture' },
  { src: 'docs/adr/ADR-004-jsdoc-documentation-standard.md', dest: 'syntax-ts/src/app/docs/architecture/adr/004-jsdoc-documentation-standard/page.md', title: 'ADR 004: JSDoc Standard' },

  // Landing Page
  { src: 'README.md', dest: 'syntax-ts/src/app/page.md', title: 'Geese: AI-Powered Code Transformation' }
];

function processFile(item) {
  const srcPath = path.resolve(item.src);
  const destPath = path.resolve(item.dest);

  if (!fs.existsSync(srcPath)) {
    console.error(`Source file not found: ${srcPath}`);
    return;
  }

  let content = fs.readFileSync(srcPath, 'utf8');

  let title = item.title;

  const h1Regex = /^#\s+(.*)$/m;
  const match = content.match(h1Regex);
  if (match) {
    content = content.replace(/^#\s+.*$/m, '').trim();
  }

  // Quote title to avoid YAML issues
  const frontmatter = `---
title: "${title}"
nextjs:
  metadata:
    title: "${title}"
    description: "Documentation for ${title}"
---

`;

  const finalContent = frontmatter + content;

  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  fs.writeFileSync(destPath, finalContent);
  console.log(`Processed: ${item.src} -> ${item.dest}`);
}

mappings.forEach(processFile);
