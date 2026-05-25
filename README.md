# jannesnys.com — personal website

A small, static personal website. No frameworks, no build step. Just HTML, CSS, and a sprinkle of JavaScript that parses a BibTeX file in the browser to render the publications page.

## Pages

| File | What it is |
|---|---|
| `index.html` | Home: hero, about, research-by-topic, selected publications, background |
| `publications.html` | Full publications list, auto-rendered from `data/biblio.bib` |
| `blog/` | Scaffold for a Distill-style blog. **Not linked from the public site.** |

## Structure

```
.
├── index.html              # home
├── publications.html       # auto-generated from BibTeX
├── css/style.css
├── data/biblio.bib         # canonical publications list
├── images/profile_pic.jpg
├── js/
│   ├── site.js             # nav toggle, typed-text effect, footer year
│   ├── bibtexParse.js      # 3rd-party BibTeX -> JSON parser
│   └── publications.js     # fetch + render publications page
└── blog/                   # hidden until you link to it from the nav
    ├── index.html          # list of posts
    ├── _template.html      # copy this to start a new post
    └── posts/              # your posts go here
```

---

## Testing locally

The site fetches `data/biblio.bib` at runtime, and browsers block `fetch()` on `file://`. So you must serve it through a tiny local HTTP server — opening `index.html` directly will only half-work (the publications page will be empty).

From the project root (`current/jannes_nys_white_site/`):

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Edit any file, refresh the browser. Done.

Other equivalents if you'd rather not use Python:

```bash
npx serve .             # Node
ruby -run -e httpd . -p 8000   # Ruby
```

The home page works fine on phones — the navbar collapses behind the ☰ button below ~768 px wide.

---

## Updating the site

Everything is plain text. Edit, save, refresh.

### Update the about / research / background text
Open `index.html` and edit. Look for the `<section id="…">` blocks.

### Add a publication
1. Open `data/biblio.bib`.
2. Paste your new BibTeX entry anywhere (the page sorts by `year` descending).
3. Refresh `publications.html`. Done.

Recommended BibTeX fields: `title`, `author`, `journal` (or `booktitle`), `year`, `doi` (or `url`). Authors use BibTeX's `"Last, First and Last, First"` (or `"First Last and First Last"`) form — the parser handles both.

### Promote a paper into "Selected publications" on the home page
The selected list is hand-curated in `index.html` (inside `<section id="selected">`). Copy an existing `<li class="selected-item">…</li>` block, edit the title, venue, year, DOI/URL, and authors. Bold your own name with `<strong>J. Nys</strong>`.

### Change the typed phrases in the hero
Edit the `typedPhrases` array in `js/site.js`.

### Swap the profile picture
Replace `images/profile_pic.jpg` (square crop looks best).

---

## Publishing to jannesnys.com

You have two reasonable options. **I recommend GitHub Pages** — it's free, runs out of a Git repo, and handles HTTPS + your custom domain for you.

### Option A — GitHub Pages (recommended)

One-time setup:

1. Create a new repo on GitHub (e.g. `jannesnys/jannesnys.com`).
2. Push this folder to it:
   ```bash
   git init
   git add .
   git commit -m "Initial site"
   git branch -M main
   git remote add origin git@github.com:jannesnys/jannesnys.com.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / root**.
4. **Settings → Pages → Custom domain**: enter `jannesnys.com`. GitHub will give you DNS instructions and tell you the IP addresses to point to.
5. At your domain registrar (where you bought `jannesnys.com`), set DNS records:
   - Four `A` records on the apex (`@`) pointing to GitHub's IPs:
     `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`.
   - A `CNAME` record `www` → `jannesnys.github.io.`
   (These are the GitHub Pages defaults; check the Pages settings page for the current canonical values.)
6. Back on GitHub Pages settings, tick **Enforce HTTPS** once it becomes available (a few minutes).
7. A file named `CNAME` containing `jannesnys.com` will be created automatically by GitHub; don't delete it.

To publish updates after that:

```bash
git add -A
git commit -m "tweak about"
git push
```

GitHub rebuilds in ~30 seconds.

### Option B — Upload to your existing web host

If you already have shared hosting (you have a `public_html/` next to this folder, suggesting cPanel-style hosting), you can rsync/SFTP this folder to it:

```bash
# example with rsync — adjust user@host and remote path
rsync -avz --delete \
  ./ user@host:~/public_html/
```

(You'll want to exclude `.git`, `README.md`, and anything else you don't want public — add a `--exclude` for each, or keep a separate deployment folder.)

Then point your domain's DNS to that host — your hosting provider will tell you the exact records.

### Other one-click hosts

- **Netlify** or **Cloudflare Pages**: drag-and-drop or connect a Git repo. Custom domain config is in their dashboard, same DNS idea.

---

## Adding a blog post (Distill-style, no build step)

The blog lives under `blog/` and is **not linked from the navigation** — so it's invisible to visitors until you wire it up.

To add a post:

1. **Copy the template:**
   ```bash
   cp blog/_template.html blog/posts/2026-05-25-my-first-post.html
   ```
   (Use today's date and a short slug.)

2. **Edit the post.** Open the file you just created. Replace:
   - The `<title>` tag.
   - The JSON inside `<d-front-matter>` (title, description, authors).
   - The `<h1>` and intro `<p>` inside `<d-title>`.
   - The body inside `<d-article>` — write normal HTML, with these extras:
     - `<d-math>x^2</d-math>` for inline math, `<d-math block>…</d-math>` for block math.
     - `<d-cite key="foo"></d-cite>` for citations, and define `foo` in the BibTeX block at the bottom.
     - `<d-footnote>note</d-footnote>` for sidenotes.
   - The BibTeX inside `<d-bibliography>` (or remove that section if you don't need it).

3. **Link it from the blog index.** Open `blog/index.html` and add an `<li>` inside a `<ul class="selected-list">` pointing to your post (an example is commented out in the file).

4. **Test locally:** `python3 -m http.server 8000`, open <http://localhost:8000/blog/>.

The Distill template is loaded from `https://distill.pub/template.v2.js` — no build, no install. Reference: <https://github.com/distillpub/template>.

### Making the blog public

When you want to expose it:

1. Add `<li><a href="blog/index.html">Blog</a></li>` to the `<ul id="nav-links">` in `index.html` and `publications.html`.
2. Remove the `<meta name="robots" content="noindex" />` from `blog/index.html` and `blog/_template.html` if you want search engines to index it.
3. Commit, push, done.

---

## Notes

- The site loads three external resources: Google Fonts (Roboto), `simple-icons` SVGs from jsDelivr, and (for blog posts only) the Distill template. Everything else is local.
- The `<script id="inline-bib">` block in `publications.html` is a tiny fallback used only if `data/biblio.bib` can't be fetched (e.g. when someone opens the file directly via `file://`).
