Personal website for Jannes Nys

Quick start

This is a static site. To view locally you must serve it with a web server (some browsers disallow fetching local files via fetch when opening index.html directly).

Using Python 3 built-in server (macOS):

```bash
# from the project root
python3 -m http.server 8000
# then open http://localhost:8000 in your browser
```

Updating publications

- Edit `data/biblio.bib` with your BibTeX entries.
- The site automatically parses and displays entries from `data/biblio.bib` when served over HTTP.

Notes

- The site uses `js/bibtexParse.js` to parse BibTeX in the browser. Keep that file in place.
- If you want nicer citation formatting (author initials, journal abbreviations, etc.) consider generating a JSON file server-side or using a small scripts to pre-format a citations list.
- To deploy, push the folder to any static host (GitHub Pages, Netlify, Vercel) or to your server for `jannesnys.com`.
