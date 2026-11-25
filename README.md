# kavinsuresh.com

A small poetry site. No build step: plain HTML hosted on GitHub Pages.

## Files

- `index.html`, `style.css`, `app.js`: the page, its styles and its logic
- `poems.js`: your poems. This is the only file you need to edit.
- `CNAME`: tells GitHub Pages to serve the site at kavinsuresh.com

## Add a poem

Open `poems.js`, copy a block, paste it at the top of the list, and edit:

```js
{
  title: "Poem Title",
  date: "2026-11-24",
  body: `First line
second line

new stanza`,
},
```

Commit and push. The site updates in about a minute.

If a poem contains a backtick (`) or `${`, put a backslash in front of it.

## One-time setup

### 1. GitHub

1. Create a public repo (for example `kavinsuresh.com`) and upload these files to it.
2. Repo **Settings > Pages**: Source = "Deploy from a branch", Branch = `main`, folder `/ (root)`.
3. In the same screen, Custom domain = `kavinsuresh.com`. Save.

### 2. Namecheap

Domain List > kavinsuresh.com > **Manage > Advanced DNS**. Delete the default parking records (the CNAME for `www` and the URL Redirect for `@`), then add:

| Type         | Host | Value                       |
|--------------|------|-----------------------------|
| A Record     | @    | 185.199.108.153             |
| A Record     | @    | 185.199.109.153             |
| A Record     | @    | 185.199.110.153             |
| A Record     | @    | 185.199.111.153             |
| CNAME Record | www  | YOUR-GITHUB-USERNAME.github.io. |

### 3. HTTPS

DNS can take from a few minutes to a few hours. Once GitHub's Pages screen shows the domain check passing, tick **Enforce HTTPS**.
