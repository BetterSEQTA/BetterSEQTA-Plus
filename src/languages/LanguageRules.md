---

# Language System Guidelines

This document outlines the structure, rules, and best practices for managing and maintaining the multilingual translation system for this project.

---

## Directory Structure

```bash
src/languages
├── LanguagesList.json #-- List Of current/required translations, update as languages are added
├── LanguageRules.md #---- This file
└── translations/ #------- Every Translation should be stored in here
    ├── eng.json #-------- individual Translation File
    ├── zho.json
    ├── hin.json
    ├── spa.json
    └── ... (etc)
```

---

## `languages.json`

The `languages.json` file defines all available languages. Each entry should follow this schema:

```json
{
  "code": "3-letter ISO 639-2 code",
  "name": "English Name of Language",
  "nativeName": "Native Name (in native script)"
}
```

### Example:

```json
[
  { "code": "eng", "name": "English", "nativeName": "English" },
  { "code": "zho", "name": "Mandarin Chinese", "nativeName": "中文 (普通话)" },
]
```

---

## Translation Files (`translations/<code>.json`)

Each language code listed in `languages.json` must have a corresponding translation file named `<code>.json` inside the `translations/` folder.

### Source of format

* `eng.json` is the **source reference file**.
* All other translations must mirror the **keys and structure** of `eng.json`.

---

## Translation File Rules

1. **File Naming**: Use the 3-letter code from `languages.json`. Example: `spa.json` for Spanish.
2. **Key Matching**: Every translation file **must have exactly the same keys** as `eng.json`.
3. **Nested Support**: Nested structures (objects within objects) are supported and must mirror the depth and order.
4. **Comments**: JSON does not allow comments. Keep translations clean.
5. **Untranslated Strings**: If a string is not translated yet, it should temporarily fallback to the English value.
6. **Encoding**: All files must be UTF-8 encoded.

### Example Structure (`eng.json`)

```json
{
  "greeting": "Hello",
  "farewell": "Goodbye",
  "menu": {
    "file": "File",
    "edit": "Edit",
    "view": "View"
  }
}
```

### Matching Example (`zho.json`)

```json
{
  "greeting": "你好",
  "farewell": "再见",
  "menu": {
    "file": "文件",
    "edit": "编辑",
    "view": "查看"
  }
}
```

---

## Avoid:

* **Missing Keys**: All translation files must contain **all keys** from `eng.json`.
* **Extra Keys**: Do not add keys that are not in `eng.json`.
* **Wrong File Name**: Do not name files with full language names or 2-letter codes.
* **Incorrect Encoding**: Ensure all files are saved as UTF-8 to avoid breaking characters.

---

## Make Sure To

* Keep translations consistent in tone and use formal/passive language where possible.
* avoid gendering items unless *absolutely necessary*
* Leave placeholders as-is (Ie. `{username}`) and ensure translators know **not** to translate them.

---

## In future:

This will hopefully be integrated with crowdin to make this crowdfunded (since translating DesQTA like this would be a pain in the ass), as of right now this is more of an outline

---

## Contribution Guidelines

If contributing new translations:

1. Add an entry in `languages.json`.
2. Create a new translation file named `<code>.json`.
3. Copy `eng.json` as a base and replace the values.
4. Submit a pull request with a clear summary of what was added or changed.

---
