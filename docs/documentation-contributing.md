@package documentation
@layer core
@category guidelines
@author AI-Generated
@date 2026-06-22

# Documentation Contribution Guidelines

## Purpose

This document outlines the standards and procedures for contributing documentation to the Vxture codebase.

## Contribution Process

1. Create a new markdown file in the appropriate location within the `docs/` directory
2. Follow the naming conventions described in this document
3. Include a proper file header with `@package`, `@layer`, `@category`, `@author`, and `@date` tags
4. Submit a pull request for review
5. Address any review comments until the PR is approved

## File Naming Conventions

- Use lowercase letters, numbers, and hyphens only
- Use kebab-case for multi-word names
- Avoid special characters except hyphens
- Examples: `api-reference.md`, `deployment-guide.md`, `contributing-docs.md`

## Content Standards

- Write in English (except for user-facing strings which remain in product languages)
- Use clear, concise language
- Follow the writing style guidelines in `docs/ai/02-coding-style.md`
- Keep paragraphs short and focused
- Use proper heading hierarchy (H2 for main sections, H3 for subsections)

## Technical Documentation Standards

- Use TypeScript-like JSDoc syntax for technical descriptions when appropriate
- Include code examples using fenced code blocks with language specifiers
- Reference relevant packages using the `@vxture/` import path convention
- Link to related concepts using relative file paths (e.g., `[Architecture Overview](architecture/00-overview.md)`)

## Review Process

- All documentation changes must be reviewed by at least one maintainer
- Reviewers should check for:
  - Accuracy of technical content
  - Consistency with existing documentation style
  - Proper linking and referencing
  - Correct file placement
- Changes must pass any documentation validation scripts
- Large changes may require additional stakeholder review

## Validation

- Documentation changes may be validated by automated scripts
- Manual review is required for significant content changes
- Broken links or invalid syntax may result in failed validation

## Translation Guidelines

- Primary documentation is in English
- Translations may be added following the localization guidelines
- Translated documents should maintain the same structure and naming (with language suffix)

## Examples

For examples of proper documentation structure, see:

- `docs/architecture/00-overview.md`
- `docs/design/identity-platform-access-topology.md`
- `docs/deployment/02-infrastructure.md`
