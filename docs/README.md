# BetterSEQTA+ Documentation

🚧 DOCS UNDER CONSTRUCTION! 🚧

Welcome to the BetterSEQTA+ documentation! This documentation will help you understand how BetterSEQTA+ works and how to extend it with plugins and new features.

## Table of Contents

### Getting Started

- [Project Overview](./README.md) - This file
- [Installation Guide](./installation.md) - How to install and set up BetterSEQTA+
- [Getting Started Contributing](./GETTING_STARTED_CONTRIBUTING.md) - **Start here!** Complete beginner-friendly guide
- [Architecture Guide](./ARCHITECTURE.md) - How BetterSEQTA+ works under the hood
- [Contributing Guide](../CONTRIBUTING.md) - Official contribution guidelines
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues and solutions

### Plugin System

- [Creating Your First Plugin](./plugins/README.md) - A comprehensive, beginner-friendly guide to creating plugins
- [Plugin API Reference](./plugins/api-reference.md) - Detailed technical documentation of the plugin APIs

## Core Concepts

BetterSEQTA+ is built around several core concepts:

1. **Plugin System**: BetterSEQTA+ uses a plugin system to extend SEQTA with new features. Plugins are self-contained pieces of code that can be enabled or disabled by the user. Check out our [plugin guide](./plugins/README.md) to learn how to create your own!

2. **Type-Safe Settings**: Each plugin can define settings that are type-safe and automatically rendered in the settings UI. The settings system uses TypeScript decorators to make it easy to define settings with proper typing.

3. **Storage API**: Plugins can use the Storage API to persist data between sessions. The Storage API is also type-safe, ensuring that plugins can only access their own data.

4. **SEQTA Integration**: BetterSEQTA+ integrates with SEQTA Learn by injecting code into the page. This allows plugins to modify the SEQTA UI and add new features.

## Getting Help

If you need help with BetterSEQTA+, you can:

- [Open an Issue](https://github.com/SeqtaLearning/betterseqta-plus/issues) - Report bugs or request features
- [Join the Discord](https://discord.gg/YzmbnCDkat) - Chat with the community
- [Email the Maintainers](mailto:betterseqta.plus@gmail.com) - Contact the maintainers directly

## Contributing to the Documentation

We welcome contributions to the documentation! If you find something unclear or missing, please open an issue or submit a pull request.

To contribute to the documentation:

1. Fork the repository
2. Make your changes to the documentation files
3. Submit a pull request with a clear description of your changes

## License

BetterSEQTA+ is licensed under the [MIT License](../LICENSE).
