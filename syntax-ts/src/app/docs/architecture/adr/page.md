---
title: "Architecture Decision Records"
nextjs:
  metadata:
    title: "Architecture Decision Records"
    description: "Documentation for Architecture Decision Records"
---

This directory contains Architecture Decision Records (ADRs) for the Geese project. ADRs document key architectural decisions, their context, and consequences.

## Format

Each ADR follows this structure:

```markdown
# ADR-NNN: Title

## Status
[Proposed | Accepted | Deprecated | Superseded by ADR-XXX]

## Context
What is the issue that we're seeing that is motivating this decision or change?

## Decision
What is the change that we're proposing and/or doing?

## Consequences
What becomes easier or more difficult to do because of this change?
```

## Index

- [ADR-001: Interface-Based Architecture](./ADR-001-interface-based-architecture.md)
- [ADR-002: Dependency Injection Container](./ADR-002-dependency-injection-container.md)
- [ADR-003: Event-Driven Cross-Cutting Concerns](./ADR-003-event-driven-cross-cutting-concerns.md)
- [ADR-004: JSDoc Documentation Standard](./ADR-004-jsdoc-documentation-standard.md)

## Creating New ADRs

When making significant architectural decisions:

1. Create a new ADR file with the next sequential number
2. Fill in the template with context, decision, and consequences
3. Update this README.md index
4. Submit for review with your changes