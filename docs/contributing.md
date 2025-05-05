# Contributing to BetterSEQTA+

Thank you for your interest in contributing to BetterSEQTA+! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
  - [Setting Up Your Development Environment](#setting-up-your-development-environment)
  - [Project Structure](#project-structure)
- [Contributing Code](#contributing-code)
  - [Branching Strategy](#branching-strategy)
  - [Pull Request Process](#pull-request-process)
  - [Coding Standards](#coding-standards)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Writing Documentation](#writing-documentation)
- [Community](#community)

## Code of Conduct

BetterSEQTA+ is committed to providing a welcoming and inclusive environment for all contributors. We expect all participants to adhere to our Code of Conduct, which promotes respectful and harassment-free interaction.

Key points:

- Be respectful and inclusive
- Focus on what is best for the community
- Show empathy towards other community members
- Be open to constructive feedback

## Getting Started

### Setting Up Your Development Environment

1. **Fork the Repository**

   Start by forking the BetterSEQTA+ repository to your GitHub account.

2. **Clone Your Fork**

   ```bash
   git clone https://github.com/yourusername/betterseqta-plus.git
   cd betterseqta-plus
   ```

3. **Install Dependencies**

   ```bash
   npm install
   ```

4. **Set Up Development Environment**

   ```bash
   npm run dev
   ```

5. **Install in Chrome/Firefox**

   Follow the [installation instructions](./installation.md#development-installation) to load the development version into your browser.

### Project Structure

Understanding the project structure will help you navigate the codebase:

```
betterseqta-plus/
├── src/                  # Source code
│   ├── plugins/          # Plugin system
│   │   ├── built-in/     # Built-in plugins
│   │   ├── core/         # Plugin core functionality
│   ├── settings/         # Settings system
│   ├── utils/            # Utility functions
│   ├── extension/        # Browser extension code
├── docs/                 # Documentation
├── test/                 # Test files
├── dist/                 # Build output (generated)
├── package.json          # Project dependencies
├── tsconfig.json         # TypeScript configuration
└── README.md             # Project README
```

## Contributing Code

### Branching Strategy

We follow a simple branching strategy:

- `main` - The main development branch
- `feature/*` - Feature branches
- `bugfix/*` - Bug fix branches
- `docs/*` - Documentation branches

Always create a new branch for your changes:

```bash
git checkout -b feature/my-new-feature
```

### Pull Request Process

1. **Keep PRs Focused**

   Each pull request should address a single concern. If you're working on multiple features, create separate PRs for each.

2. **Write Clear Commit Messages**

   Follow the conventional commits format:

   ```
   feat: add new feature
   fix: resolve bug with timetable
   docs: update installation instructions
   ```

3. **Update Documentation**

   If your changes require documentation updates, include them in the same PR.

4. **Run Tests**

   Make sure all tests pass before submitting your PR:

   ```bash
   npm test
   ```

5. **Submit Your PR**

   When you're ready, push your branch and create a pull request on GitHub.

6. **Code Review**

   All PRs will be reviewed by maintainers. Be responsive to feedback and make requested changes.

7. **Merge**

   Once approved, a maintainer will merge your PR.

### Coding Standards

We follow TypeScript best practices and have a consistent code style:

1. **Use TypeScript**

   All new code should be written in TypeScript with proper typing.

2. **Follow Existing Patterns**

   Match the coding style of the existing codebase.

3. **Write Tests**

   Add tests for new features and bug fixes.

4. **Document Your Code**

   Add comments for complex logic and JSDoc comments for functions.

5. **Use Linters**

   We use ESLint and Prettier. Run them before submitting your PR:

   ```bash
   npm run lint
   npm run format
   ```

## Reporting Bugs

If you find a bug, please report it by creating an issue on GitHub:

1. **Search Existing Issues**

   Check if the bug has already been reported.

2. **Use the Bug Report Template**

   Fill in all sections of the bug report template:

   - Description
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Screenshots (if applicable)
   - Environment (browser, OS, etc.)

3. **Be Specific**

   The more details you provide, the easier it will be to fix the bug.

## Suggesting Features

We welcome feature suggestions! To suggest a new feature:

1. **Search Existing Suggestions**

   Check if your idea has already been suggested.

2. **Use the Feature Request Template**

   Fill in all sections of the feature request template:

   - Description
   - Use case
   - Potential implementation
   - Alternatives considered

3. **Be Patient**

   Feature requests are evaluated based on alignment with project goals, feasibility, and maintainer bandwidth.

## Writing Documentation

Good documentation is crucial for the project. To contribute to documentation:

1. **Identify Gaps**

   Look for areas where documentation is missing or unclear.

2. **Follow Documentation Style**

   Maintain a consistent style and format.

3. **Use Clear Language**

   Write in simple, clear English. Avoid jargon when possible.

4. **Include Examples**

   Code examples and screenshots help users understand.

5. **Submit a PR**

   Follow the same process as code contributions, but create a branch with a `docs/` prefix.

## Community

Join our community channels to discuss the project, get help, and connect with other contributors:

- **Discord Server**: [Join our Discord](https://discord.gg/betterseqta)
- **GitHub Discussions**: For longer-form conversations
- **GitHub Issues**: For bug reports and feature requests

## Creating Plugins

If you're interested in creating plugins for BetterSEQTA+, check out our plugin development guides:

- [Creating Your First Plugin](./plugins/creating-plugins.md)
- [Plugin API Reference](./advanced/plugin-api.md)

## Recognition

Contributors are recognized in several ways:

1. **CONTRIBUTORS.md**: All contributors are listed in this file
2. **Release Notes**: Significant contributions are highlighted in release notes
3. **Community Recognition**: Regular shout-outs in community channels

## Questions?

If you have any questions about contributing, please:

1. Check the documentation
2. Ask in the Discord server
3. Open a GitHub Discussion

Thank you for contributing to BetterSEQTA+! Your efforts help make SEQTA better for students and teachers everywhere.
