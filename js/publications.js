// publications.js — fetch BibTeX, parse, and render grouped by year.
document.addEventListener('DOMContentLoaded', () => {
  const pubContainer = document.getElementById('publications-container');
  if (!pubContainer) return;
  pubContainer.innerHTML = '<p class="note">Loading publications…</p>';

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  const bibCandidates = ['data/biblio.bib', './data/biblio.bib', '/data/biblio.bib'];
  try {
    const docBase = document.baseURI || window.location.href;
    bibCandidates.push(new URL('data/biblio.bib', docBase).href);
  } catch (e) {}

  const attemptDetails = [];

  function tryFetchCandidates(idx = 0) {
    if (idx >= bibCandidates.length) {
      const inline = document.getElementById('inline-bib');
      if (inline && inline.textContent && inline.textContent.trim().length > 0) {
        return Promise.resolve(inline.textContent);
      }
      return Promise.reject(new Error('No bib file found'));
    }
    const path = bibCandidates[idx];
    return fetch(path)
      .then((res) => {
        if (!res.ok) {
          attemptDetails.push({ url: path, ok: false, status: res.status, statusText: res.statusText });
          throw new Error('HTTP ' + res.status);
        }
        attemptDetails.push({ url: path, ok: true, status: res.status });
        return res.text();
      })
      .catch((err) => {
        attemptDetails.push({ url: path, ok: false, error: err && err.message ? err.message : String(err) });
        return tryFetchCandidates(idx + 1);
      });
  }

  tryFetchCandidates()
    .then((bibText) => {
      const entries = bibtexParse.toJSON(bibText || '') || [];
      const filtered = entries.filter((entry) => {
        const type = (entry.entryType || '').toUpperCase();
        return type !== 'COMMENT' && type !== 'PREAMBLE' && type !== 'STRING';
      });
      filtered.sort((a, b) => {
        const yearA = parseInt(a.entryTags?.year || '0', 10);
        const yearB = parseInt(b.entryTags?.year || '0', 10);
        return yearB - yearA;
      });
      if (filtered.length === 0) {
        pubContainer.innerHTML = '<p class="warning">No publications found in the BibTeX file.</p>';
      } else {
        pubContainer.innerHTML = '';
        renderPublications(filtered);
      }
    })
    .catch((err) => {
      let html = '<p class="warning">Unable to load publications.</p>';
      if (attemptDetails.length) {
        html += '<ul class="diagnostics">';
        attemptDetails.forEach((d) => {
          const status = d.ok ? ('OK ' + (d.status || '')) : (d.status ? ('HTTP ' + d.status) : ('Error: ' + (d.error || 'unknown')));
          html += '<li><code>' + escapeHtml(d.url) + '</code> — ' + escapeHtml(status) + '</li>';
        });
        html += '</ul>';
      }
      if (window.location && window.location.protocol === 'file:') {
        html += '<p class="note">Browsers block fetching local files when you open a page via file://. Serve the site with <code>python3 -m http.server 8000</code> and open <code>http://localhost:8000/publications.html</code>.</p>';
      }
      pubContainer.innerHTML = html;
    });

  function renderPublications(entries) {
    let currentYear = '';
    entries.forEach((entry) => {
      const year = entry.entryTags?.year || '';
      if (year !== currentYear) {
        currentYear = year;
        const yearHeading = document.createElement('h3');
        yearHeading.textContent = year;
        pubContainer.appendChild(yearHeading);
      }
      let list = pubContainer.querySelector('ul.publication-list[data-year="' + currentYear + '"]');
      if (!list) {
        list = document.createElement('ul');
        list.className = 'publication-list';
        list.setAttribute('data-year', String(currentYear));
        pubContainer.appendChild(list);
      }
      const li = document.createElement('li');
      li.className = 'publication-item';
      li.innerHTML = formatCitation(entry);
      list.appendChild(li);
    });
  }

  function sanitizeBibtex(raw) {
    if (!raw) return '';
    let s = String(raw);
    s = s.replace(/^\s*\{+|\}+\s*$/g, '');
    s = s.replace(/\\(?:emph|textit)\{([^}]*)\}/g, '<em>$1</em>');
    const accentMap = {
      "'": { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', y: 'ý', A: 'Á', E: 'É', I: 'Í', O: 'Ó', U: 'Ú', Y: 'Ý' },
      '`': { a: 'à', e: 'è', i: 'ì', o: 'ò', u: 'ù', A: 'À', E: 'È', I: 'Ì', O: 'Ò', U: 'Ù' },
      '^': { a: 'â', e: 'ê', i: 'î', o: 'ô', u: 'û', A: 'Â', E: 'Ê', I: 'Î', O: 'Ô', U: 'Û' },
      '"': { a: 'ä', e: 'ë', i: 'ï', o: 'ö', u: 'ü', y: 'ÿ', A: 'Ä', E: 'Ë', I: 'Ï', O: 'Ö', U: 'Ü', Y: 'Ÿ' },
      '~': { n: 'ñ', a: 'ã', o: 'õ', N: 'Ñ', A: 'Ã', O: 'Õ' },
      c: { c: 'ç', C: 'Ç' },
      v: { s: 'š', S: 'Š', c: 'č', C: 'Č', z: 'ž', Z: 'Ž' }
    };
    s = s.replace(/\\([`'\^\"~])\{?\\?([A-Za-z])\}?/g, function(_, acc, ch) {
      const table = accentMap[acc];
      if (table && table[ch]) return table[ch];
      if (table && table[ch.toLowerCase()]) {
        const out = table[ch.toLowerCase()];
        return ch === ch.toUpperCase() ? out.toUpperCase() : out;
      }
      return ch;
    });
    s = s.replace(/\\([cv])\{?([A-Za-z])\}?/g, function(_, cmd, ch) {
      const table = accentMap[cmd];
      if (table && table[ch]) return table[ch];
      if (table && table[ch.toLowerCase()]) {
        const out = table[ch.toLowerCase()];
        return ch === ch.toUpperCase() ? out.toUpperCase() : out;
      }
      return ch;
    });
    s = s.replace(/\$[^$]*\$/g, '');
    s = s.replace(/\\\([^)]*\\\)/g, '');
    s = s.replace(/\\&/g, '&');
    s = s.replace(/~/g, ' ');
    s = s.replace(/---/g, '—').replace(/--/g, '–');
    s = s.replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1');
    s = s.replace(/\\([a-zA-Z]+)/g, '$1');
    s = s.replace(/[{}]/g, '');
    s = s.replace(/\\(?:rightarrow|to)\b/g, '→');
    s = s.replace(/\\leftrightarrow\b/g, '↔');
    s = s.replace(/\\times\b/g, '×');
    s = s.replace(/\\pm\b/g, '±');
    s = s.replace(/\\cdot\b/g, '·');
    s = s.replace(/\\approx\b/g, '≈');
    s = s.replace(/\\ldots\b/g, '…');
    s = s.replace(/(\d)\s*(?:\\(?:rightarrow|to)|→|rightarrow)\s*(\d)/g, '$1→$2');
    s = s.replace(/\\(?:mathbf|mathrm|mathit)\{([^}]*)\}/g, '$1');
    s = s.replace(/\b(?:mathbf|mathrm|mathit)\b\s*/g, '');
    const openToken = '___EM_OPEN___';
    const closeToken = '___EM_CLOSE___';
    s = s.replace(/<em>/g, openToken).replace(/<\/em>/g, closeToken);
    s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
         .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    s = s.replace(new RegExp(openToken, 'g'), '<em>').replace(new RegExp(closeToken, 'g'), '</em>');
    return s.trim();
  }

  function formatAuthorName(name) {
    if (!name) return '';
    let s = sanitizeBibtex(name).replace(/\s+/g, ' ').trim();
    const isInitial = (tok) => /^[A-Za-z]$/.test(tok) || /^[A-Za-z]\.$/.test(tok);
    const cleanToken = (t) => t.replace(/^\.+|\.+$/g, '').replace(/^\(|\)$/g, '').trim();
    if (s.indexOf(',') >= 0) {
      const parts = s.split(',');
      const last = cleanToken(parts[0]);
      const firstPart = parts.slice(1).join(',').trim();
      const toks = firstPart.split(/\s+/).filter(Boolean).map(cleanToken);
      const firstNorm = toks.map(t => isInitial(t) ? (t.replace('.', '') + '.') : t).join(' ');
      return (firstNorm + ' ' + last).trim();
    }
    const tokens = s.split(' ').filter(Boolean).map(cleanToken);
    if (tokens.length <= 1) return s;
    const lower = (t) => t.toLowerCase();
    const particles = new Set(['van','von','de','del','den','der','di','la','le','du','mc','mac','al']);
    let lastName = tokens[tokens.length - 1];
    let given = tokens.slice(0, tokens.length - 1);
    if (tokens.length >= 2 && particles.has(lower(tokens[tokens.length - 2]))) {
      lastName = tokens.slice(tokens.length - 2).join(' ');
      given = tokens.slice(0, tokens.length - 2);
    }
    const givenNorm = given.map(t => isInitial(t) ? (t.replace('.', '') + '.') : t).join(' ');
    return (givenNorm + ' ' + lastName).trim();
  }

  function formatAuthors(raw) {
    if (!raw) return '';
    raw = raw.replace(/,?\s*(and\s+)?others\.?/i, ' et al.');
    const parts = raw.split(/\s+and\s+/i).map(p => p.trim()).filter(Boolean);
    const names = parts.map(formatAuthorName).filter(Boolean);
    if (names.length === 0) return '';
    if (names.length === 1) return names[0];
    if (names.length === 2) return names[0] + ' and ' + names[1];
    return names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1];
  }

  function formatCitation(entry) {
    const tags = entry.entryTags || {};
    const authors = formatAuthors(tags.author || '');
    const title = sanitizeBibtex(tags.title || '');
    const venue = sanitizeBibtex(tags.journal || tags.booktitle || tags.school || '');
    const pages = tags.pages ? `, ${tags.pages}` : '';
    const yearStr = tags.year ? ` (${tags.year})` : '';
    let link = '';
    if (tags.doi) {
      const doi = sanitizeBibtex(tags.doi.trim());
      link = `. <a href="https://doi.org/${doi}" target="_blank" rel="noopener">DOI</a>`;
    } else if (tags.url) {
      const url = sanitizeBibtex(tags.url.trim());
      link = `. <a href="${url}" target="_blank" rel="noopener">link</a>`;
    }
    const citationParts = [];
    if (title) citationParts.push(title + '.');
    if (venue) citationParts.push(venue);
    if (yearStr) citationParts.push(yearStr);
    if (pages) citationParts.push(pages);
    const citation = citationParts.join(' ') + (link || '');
    if (authors) {
      const authorsHtml = String(authors).replace(/\bJannes Nys\b/g, '<strong>Jannes Nys</strong>');
      return citation + ' <p class="pub-authors">Authors: ' + authorsHtml + '.</p>';
    }
    return citation;
  }
});
