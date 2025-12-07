---
title: "Security Model"
nextjs:
  metadata:
    title: "Security Model"
    description: "Documentation for Security Model"
---

This document explains how Geese handles security, particularly regarding file access and command execution.

## Input Validation

Geese employs a centralized `InputValidator` to sanitize all user inputs.

*   **Prototype Pollution**: Object paths are validated to prevent `__proto__` attacks.
*   **Path Traversal**: File paths are checked against directory traversal attacks (`../`) unless explicitly allowed by configuration.
*   **Command Injection**: Inputs passed to shell commands are validated for dangerous characters.

## File Access Control

### Rate Limiting

To prevent resource exhaustion (or API rate limits if pipes hit external services), file operations are rate-limited.

*   **Default**: 50 reads/second.
*   **Mechanism**: Token bucket algorithm.

### Scope Restrictions

By default, Geese allows reading files anywhere on the system if specified in a template (e.g., `readFile /etc/hosts`). However, validation logic exists to restrict this to the project root if stricter security modes are enabled in future versions.

## Execution Safety

### Tool Isolation

External AI tools are executed in separate child processes. Geese communicates via standard streams (stdin/stdout).

### Dry Run

The `--dry-run` flag is a crucial security feature. It allows users to inspect exactly what will be sent to the AI tool before any execution happens. This includes:
*   The exact files matched.
*   The fully rendered prompt content.

## Recommendations

*   **Review `.geese` files**: Treat them like scripts. Do not run untrusted `.geese` files without inspection.
*   **Use `--dry-run`**: Always preview the impact of a new batch task.