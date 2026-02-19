# Copilot Instructions

## Translations (i18n)

Translation files are edited directly:

- `src/messages/de.json` — German (base language)
- `src/messages/en.json` — English

To add a new translation key:
1. Add the key to **both** `de.json` and `en.json` in the correct namespace, in alphabetical order
2. Run `npm run i18n:validate` to verify both locales are in sync

See `I18N.md` for full documentation.
