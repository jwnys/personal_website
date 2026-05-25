# jannesnys.com — personal website

A small, static personal website. No frameworks, no build step. Just HTML, CSS, and a sprinkle of JavaScript that parses a BibTeX file in the browser to render the publications page.

**Repo:** <https://github.com/jwnys/personal_website>
**Live:** <https://jannesnys.com> (once DNS is set — see [Publishing](#publishing-to-jannesnyscom) below)

## Pages

| File | What it is |
|---|---|
| `index.html` | Home: hero, about, research-by-topic, background |
| `publications.html` | Selected list + full publications, auto-rendered from `data/biblio.bib` |
| `blog/` | Scaffold for a Distill-style blog. **Not linked from the public site.** |

## Structure

```
.
├── index.html              # home
├── publications.html       # selected pubs (hand-curated) + full list (from BibTeX)
├── css/style.css
├── data/biblio.bib         # canonical publications list
├── images/profile_pic2.jpg # the photo used on the home page
├── js/
│   ├── site.js             # nav toggle, typed-text effect, footer year
│   ├── bibtexParse.js      # 3rd-party BibTeX -> JSON parser
│   └── publications.js     # fetch + render publications page
└── blog/                   # hidden — no nav link
    ├── index.html          # list of posts
    ├── _template.html      # copy this to start a new post
    └── posts/              # your posts go here
```

---

## Testing locally

The site fetches `data/biblio.bib` at runtime, and browsers block `fetch()` on `file://`. So you must serve it through a tiny local HTTP server — opening `index.html` directly will only half-work (the publications page will be empty).

From this folder:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Edit any file, refresh the browser. Done.

Equivalents:

```bash
npx serve .                       # Node
ruby -run -e httpd . -p 8000      # Ruby
```

`publications.js` cache-busts the `.bib` fetch on every load, so a normal refresh always picks up new BibTeX entries. If you edit CSS or JS, do a hard refresh once (`Cmd+Shift+R`) — those are versioned via `?v=N` in the HTML.

---

## Updating the site

Everything is plain text. Edit, save, refresh.

### About / research / background text
Open `index.html` and edit. Look for the `<section id="…">` blocks.

### Add a publication
1. Open `data/biblio.bib`.
2. Paste your new BibTeX entry anywhere (the page sorts by `year` descending).
3. Refresh `publications.html`. Done.

Recommended BibTeX fields: `title`, `author`, `journal` (or `booktitle`), `year`, `doi` (or `url`). Authors use BibTeX's `"Last, First and Last, First"` (or `"First Last and First Last"`) form — the parser handles both.

For the bib key, the convention used here is `lastnameYYYYkeyword` matching the publication year (e.g. `nys2024ab` for a 2024 paper). The site sorts by the `year` field, not the key — keys are just labels.

### Promote a paper into "Selected publications"
The selected list at the top of `publications.html` is hand-curated. Copy an existing `<li class="selected-item">…</li>` block, edit the title, venue, year, DOI/URL, and authors. Bold your own name with `<strong>J. Nys</strong>`.

### Change the typed phrases in the hero
Edit the `typedPhrases` array in `js/site.js`.

### Swap the profile picture
Replace the image in `images/` and update the `<img src="…">` in `index.html`.

---

## Publishing to jannesnys.com

The site is hosted on **GitHub Pages** out of the [`jwnys/personal_website`](https://github.com/jwnys/personal_website) repo.

### One-time setup

1. **Push the repo.** If you've made local changes, commit and push:
   ```bash
   git add -A
   git commit -m "Update site"
   git push -u origin main
   ```

2. **Enable Pages.** Open <https://github.com/jwnys/personal_website/settings/pages>:
   - *Source*: **Deploy from a branch**
   - *Branch*: `main` / `/ (root)` → **Save**

3. **Verify the staging URL works** (~30 sec after save):
   <https://jwnys.github.io/personal_website/>

4. **Set the custom domain.** Same Pages settings page → *Custom domain* field:
   - Enter `jannesnys.com` → **Save**.
   - This creates a `CNAME` file in the repo — **don't delete it**.

5. **Point DNS at GitHub.** At your domain registrar's DNS panel, add **5 records** (delete any existing records on `@` or `www` first):

   | Type | Name | Value |
   |---|---|---|
   | A | @ | 185.199.108.153 |
   | A | @ | 185.199.109.153 |
   | A | @ | 185.199.110.153 |
   | A | @ | 185.199.111.153 |
   | CNAME | www | jwnys.github.io. |

6. **Wait, then enable HTTPS.** DNS propagation usually takes 5–30 min. Check with:
   ```bash
   dig jannesnys.com +short
   ```
   You should see the four GitHub IPs. Back on Pages settings, tick **Enforce HTTPS** once the DNS check turns green (GitHub provisions a Let's Encrypt cert automatically).

### Future updates

Every edit after that goes live with:

```bash
git add -A
git commit -m "your message"
git push
```

GitHub rebuilds in ~30 seconds. No build step on your end.

### Prerequisites

- **Repo must be public.** GitHub Pages requires a paid plan on private repos. Toggle at *Settings → General → Danger zone → Change visibility → Public*.
- **`.DS_Store`** shouldn't be committed. Add it to `.gitignore` if it isn't already.

---

## Adding a blog post (Distill-style, no build step)

The blog lives under `blog/` and is **not linked from the navigation** — invisible to visitors until you wire it up.

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

- The site loads three external resources: Google Fonts (Roboto + Roboto Slab), `simple-icons` SVGs from jsDelivr, and (for blog posts only) the Distill template. Everything else is local.
- The `<script id="inline-bib">` block in `publications.html` is a tiny fallback used only if `data/biblio.bib` can't be fetched (e.g. when someone opens the file directly via `file://`).
