# BetterSEQTA+ Documentation

**Canonical documentation lives at [docs.betterseqta.org](https://docs.betterseqta.org/).** The pages below are the same topics; use the site for search, navigation, and the latest updates.

## Table of Contents

### Getting Started

- [Documentation home](https://docs.betterseqta.org/)
- [Installation](https://docs.betterseqta.org/install/)
- [Contributing](https://docs.betterseqta.org/contributing/)
- [Architecture](https://docs.betterseqta.org/architecture/)
- [Contribution guidelines (repository)](../CONTRIBUTING.md)
- [Troubleshooting](https://docs.betterseqta.org/troubleshooting/)

### Features & customization

- [Features](https://docs.betterseqta.org/features/)
- [Themes & customization](https://docs.betterseqta.org/customization/)
- [Theme creation](https://docs.betterseqta.org/theme-creation/)

### Plugin system

- [Plugins overview](https://docs.betterseqta.org/plugins/)
- [Plugin development](https://docs.betterseqta.org/plugin-development/)
- [Plugin API](https://docs.betterseqta.org/plugin-api/)
- [Example plugin](https://docs.betterseqta.org/example-plugin/)

## Core Concepts

BetterSEQTA+ is built around several core concepts:

1. **Plugin System**: BetterSEQTA+ uses a plugin system to extend SEQTA with new features. Plugins are self-contained pieces of code that can be enabled or disabled by the user. See the [plugins documentation](https://docs.betterseqta.org/plugins/).

2. **Type-Safe Settings**: Each plugin can define settings that are type-safe and automatically rendered in the settings UI. The settings system uses TypeScript decorators to make it easy to define settings with proper typing.

3. **Storage API**: Plugins can use the Storage API to persist data between sessions. The Storage API is also type-safe, ensuring that plugins can only access their own data.

4. **SEQTA Integration**: BetterSEQTA+ integrates with SEQTA Learn by injecting code into the page. This allows plugins to modify the SEQTA UI and add new features.

## Getting Help

If you need help with BetterSEQTA+, you can:

- [Open an Issue](https://github.com/BetterSEQTA/BetterSEQTA-Plus/issues) - Report bugs or request features
- [Join the Discord](https://discord.gg/YzmbnCDkat) - Chat with the community
- [Email the Maintainers](mailto:betterseqta.plus@gmail.com) - Contact the maintainers directly

## Contributing to the Documentation

We welcome contributions to the documentation. The published site is built from the documentation repository; see [Contributing](https://docs.betterseqta.org/contributing/) for how to help.

## License

BetterSEQTA+ is licensed under the [MIT License](../LICENSE).
