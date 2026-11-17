# Shivam Sahu — portfolio

Static GitHub Pages site. No build step or runtime JavaScript libraries are required.

## Local development

With Node.js 18 or newer:

```sh
npm run dev
npm test
```

The preview serves at http://127.0.0.1:5173. There are no npm dependencies to install.

## Editing

- `index.html`: profile, employment, projects, skills and contact links.
- `css/style.css`: layout, responsive navigation and project dialogs.
- `js/site.js`: mobile menu and native HTML dialog interactions.
- `css/github-contributions.css` and `js/github-contributions.js`: contribution chart.
- `github.html`: compatibility redirect to the main activity section.

LinkedIn uses a locally rendered profile card linking to the public profile. Its text is maintained in `index.html`; it does not sync automatically. The [LinkedIn public profile badge](https://www.linkedin.com/help/linkedin/answer/a517984) retires after December 12, 2026.

The activity chart reads public contribution data from the [GitHub Contributions API](https://github.com/grubersjoe/github-contributions-api), which caches responses for an hour. The browser receives no credentials. A failed or timed-out request shows a retry button and preserves the direct GitHub link. Unit tests cover dates, invalid data and network failures.

The site retains the original teal/dark visual identity and photos. Original design: [W3layouts](https://w3layouts.com/), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). The bundled Font Awesome files retain their license notice.
