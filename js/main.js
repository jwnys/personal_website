// main.js
// Fetch and parse BibTeX file, then render publication list

// Single DOMContentLoaded handler for page initialisation
document.addEventListener('DOMContentLoaded', () => {
  // Utility to escape text for safe insertion into HTML diagnostics
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Responsive nav toggle
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
  }

  // Typed text effect for the hero tagline. Cycles through phrases and types them.
  // Updated to the user's preferred sequence (starts with AI for science)
  const typedPhrases = [
    'AI for science',
    'quantum physics',
    'quantum computing',
    'machine learning'
  ];
  let currentPhraseIndex = 0;
  let charIndex = 0;
  const typingDelay = 100;
  const erasingDelay = 60;
  const newPhraseDelay = 2000;
  const typedTextElement = document.getElementById('typed-text');
  function type() {
    if (!typedTextElement) return;
    if (charIndex < typedPhrases[currentPhraseIndex].length) {
      typedTextElement.textContent += typedPhrases[currentPhraseIndex].charAt(charIndex);
      charIndex++;
      setTimeout(type, typingDelay);
    } else {
      setTimeout(erase, newPhraseDelay);
    }
  }

  function erase() {
    if (!typedTextElement) return;
    if (charIndex > 0) {
      typedTextElement.textContent = typedPhrases[currentPhraseIndex].substring(0, charIndex - 1);
      charIndex--;
      setTimeout(erase, erasingDelay);
    } else {
      currentPhraseIndex = (currentPhraseIndex + 1) % typedPhrases.length;
      setTimeout(type, typingDelay);
    }
  }
  // Start typing after a short delay
  setTimeout(type, 500);

  // Path candidates to try when loading the BibTeX file. This helps when the
  // site is hosted at different base paths.
  const bibCandidates = ['data/biblio.bib', './data/biblio.bib', '/data/biblio.bib', 'biblio.bib'];
  // Add resolved URL based on document base and location to handle subpath deploys
  try {
    const docBase = document.baseURI || window.location.href;
    const resolved = new URL('data/biblio.bib', docBase).href;
    bibCandidates.push(resolved);
  } catch (e) {
    // ignore
  }
  try {
    const originBase = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
    const resolved2 = new URL('data/biblio.bib', originBase).href;
    bibCandidates.push(resolved2);
  } catch (e) {}

  const pubContainer = document.getElementById('publications-container');
  if (pubContainer) pubContainer.innerHTML = '<p class="note">Loading publications…</p>';

  // Try fetch candidates in sequence until one succeeds
  const attempted = [];
  const attemptDetails = [];
  // Ensure the bibtex parser is available. Returns a Promise that resolves when ready.
  function ensureBibtexParser() {
    return new Promise((resolve, reject) => {
      // Fast path: already available
      if (typeof bibtexParse !== 'undefined' && bibtexParse && typeof bibtexParse.toJSON === 'function') {
        return resolve();
      }

      // If a script tag exists that points to bibtexParse.js, wait briefly for it to initialize
      const existing = Array.from(document.getElementsByTagName('script')).find(
        (s) => s.src && s.src.includes('bibtexParse.js')
      );
      const waitForGlobal = (timeoutMs = 2000) => {
        const start = Date.now();
        const iv = setInterval(() => {
          if (typeof bibtexParse !== 'undefined' && bibtexParse && typeof bibtexParse.toJSON === 'function') {
            clearInterval(iv);
            return resolve();
          }
          if (Date.now() - start > timeoutMs) {
            clearInterval(iv);
            return reject(new Error('bibtexParse did not initialize'));
          }
        }, 50);
      };

      if (existing) {
        waitForGlobal(2000);
        return;
      }

      // Otherwise inject the parser script and wait for it to define window.bibtexParse
      const script = document.createElement('script');
      script.src = 'js/bibtexParse.js';
      script.async = false; // execute in order
      script.onload = () => {
        // give the script a tick to run
        setTimeout(() => {
          if (typeof bibtexParse !== 'undefined' && bibtexParse && typeof bibtexParse.toJSON === 'function') {
            return resolve();
          }
          // wait a little longer for global to appear
          waitForGlobal(1500);
        }, 30);
      };
      script.onerror = (e) => reject(new Error('Failed to load js/bibtexParse.js'));
      document.head.appendChild(script);
    });
  }
  function tryFetchCandidates(idx = 0) {
    if (idx >= bibCandidates.length) {
      // All fetch attempts failed. Try to find an inline <script id="inline-bib"> as a fallback.
      const inline = document.getElementById('inline-bib');
      if (inline && inline.textContent && inline.textContent.trim().length > 0) {
        console.log('Using inline BibTeX fallback from #inline-bib');
        return Promise.resolve(inline.textContent);
      }
      // Render a diagnostic summary with per-URL details
      const container = document.getElementById('publications-container');
      if (container) {
        let detailsHtml = '<p class="warning">Unable to load publications. Detailed diagnostics for each attempted URL:</p>' +
          '<ul class="diagnostics">';
        attemptDetails.forEach((d) => {
          const statusPart = d.ok ? ('OK (status ' + (d.status || '200') + ')') : (d.status ? ('HTTP ' + d.status + ' ' + (d.statusText || '')) : ('Error: ' + (d.error || 'unknown')));
          detailsHtml += '<li><code>' + escapeHtml(d.url) + '</code> — ' + escapeHtml(statusPart) + '</li>';
        });
        detailsHtml += '</ul>';
        detailsHtml += '<p class="note">If you are testing locally, run a static server from the project root (for example: <code>python3 -m http.server 8000</code>) and open <code>http://localhost:8000</code>. If the server is already running, check browser DevTools for CORS or network errors.</p>';
        container.innerHTML = detailsHtml;
      }
      return Promise.reject(new Error('No bib file found'));
    }
    const path = bibCandidates[idx];
    attempted.push(path);
    console.log('Trying to fetch BibTeX from', path);
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
        // Record the exception message for diagnostics and continue to next candidate
        attemptDetails.push({ url: path, ok: false, error: err && err.message ? err.message : String(err) });
        console.debug('Fetch failed for', path, err);
        return tryFetchCandidates(idx + 1);
      });
  }

  tryFetchCandidates()
    .then((bibText) => ensureBibtexParser().then(() => bibText))
    .then((bibText) => {
      // Diagnostics: log fetched size
      try {
        console.log('Fetched BibTeX length:', bibText ? bibText.length : 0);
      } catch (e) {}
      // Parse the BibTeX content into JSON entries (with explicit try/catch to surface parser errors)
      let entries = [];
      try {
        entries = bibtexParse.toJSON(bibText || '') || [];
        console.log('Parsed BibTeX entries count:', entries.length);
      } catch (parseErr) {
        console.error('BibTeX parser error:', parseErr);
        attemptDetails.push({ url: '(parser)', ok: false, error: parseErr && parseErr.message ? parseErr.message : String(parseErr) });
        throw parseErr;
      }
      // Filter out comments and preambles
      const filtered = entries.filter((entry) => {
        const type = (entry.entryType || '').toUpperCase();
        return type !== 'COMMENT' && type !== 'PREAMBLE' && type !== 'STRING';
      });
      // Sort entries by year descending (most recent first). Missing years go last.
      filtered.sort((a, b) => {
        const yearA = parseInt(a.entryTags?.year || '0', 10);
        const yearB = parseInt(b.entryTags?.year || '0', 10);
        return yearB - yearA;
      });
      // Render to the DOM
      const container = document.getElementById('publications-container');
      if (filtered.length === 0) {
        if (container) container.innerHTML = '<p class="warning">No publications found in the BibTeX file. Parser returned ' + entries.length + ' entries.</p>' +
          (bibText && bibText.length ? '<details><summary>Preview of start of BibTeX file</summary><pre>' + escapeHtml(bibText.slice(0, 1000)) + (bibText.length > 1000 ? '\n... (truncated) ' : '') + '</pre></details>' : '');
      } else {
        // Clear container then render
        if (container) container.innerHTML = '';
        renderPublications(filtered);
      }
    })
    .catch((err) => {
      console.error('Failed to load BibTeX file:', err);
      // Record parsing/processing error so it appears in the diagnostics
      try {
        attemptDetails.push({ url: '(parser)', ok: false, error: err && err.message ? err.message : String(err) });
      } catch (pushErr) {
        console.error('Failed to record diagnostic:', pushErr);
      }
      const container = document.getElementById('publications-container');
      if (container) {
        // If attemptDetails contains diagnostics, show them; otherwise show a simple message
        if (attemptDetails && attemptDetails.length) {
          let detailsHtml = '<p class="warning">Unable to load publications. Detailed diagnostics for each attempted URL:</p>' +
            '<ul class="diagnostics">';
          attemptDetails.forEach((d) => {
            const statusPart = d.ok ? ('OK (status ' + (d.status || '200') + ')') : (d.status ? ('HTTP ' + d.status + ' ' + (d.statusText || '')) : ('Error: ' + (d.error || 'unknown')));
            detailsHtml += '<li><code>' + escapeHtml(d.url) + '</code> — ' + escapeHtml(statusPart) + '</li>';
            if (d.error && d.url === '(parser)') {
              detailsHtml += '<li class="parser-error">' + escapeHtml(d.error) + '</li>';
            }
          });
          detailsHtml += '</ul>';
          if (window.location && window.location.protocol === 'file:') {
            detailsHtml += '<p class="note">It looks like you opened the page directly (file://). Browsers block fetching local files from pages loaded this way. Run a simple static server from the project root, for example:<br/>' +
              '<code>python3 -m http.server 8000</code><br/>Then open <code>http://localhost:8000</code> in your browser.</p>';
          } else {
            detailsHtml += '<p class="note">If you are testing locally, be sure to run a static server (e.g. <code>python3 -m http.server</code>) and that <code>data/biblio.bib</code> is present. Check the browser DevTools network tab and console for CORS or network errors.</p>';
          }
          container.innerHTML = detailsHtml;
        } else {
          container.innerHTML = '<p class="warning">Unable to load publications. Please ensure this website is served over a web server for the publications list to appear.</p>';
        }
      }
    });
});

/**
 * Render the publications grouped by year.
 * @param {Array} entries - Parsed BibTeX entries
 */
function renderPublications(entries) {
  const container = document.getElementById('publications-container');
  if (!container) return;
  let currentYear = '';
  entries.forEach((entry) => {
    const year = entry.entryTags?.year || '';
    // Insert a year heading when the year changes
    if (year !== currentYear) {
      currentYear = year;
      const yearHeading = document.createElement('h3');
      yearHeading.textContent = year;
      container.appendChild(yearHeading);
    }
    const pubDiv = document.createElement('div');
    pubDiv.className = 'publication';
    const citation = formatCitation(entry);
    pubDiv.innerHTML = citation;
    container.appendChild(pubDiv);
  });

}

/**
 * Format a single BibTeX entry into an HTML citation string.
 * @param {Object} entry - BibTeX entry
 * @returns {string}
 */
function formatCitation(entry) {
  const tags = entry.entryTags || {};
  // Helper: normalize BibTeX values to readable HTML-safe text
  function sanitizeBibtex(raw) {
    if (!raw) return '';
    let s = String(raw);
    // Remove wrapping braces
    s = s.replace(/^\s*\{+|\}+\s*$/g, '');
    // Convert common LaTeX emphasis to <em>
    s = s.replace(/\\(?:emph|textit)\{([^}]*)\}/g, '<em>$1</em>');
    // Convert common LaTeX accent commands to Unicode (handles braced and unbraced forms)
    const accentMap = {
      "'": { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', y: 'ý', A: 'Á', E: 'É', I: 'Í', O: 'Ó', U: 'Ú', Y: 'Ý' },
      '`': { a: 'à', e: 'è', i: 'ì', o: 'ò', u: 'ù', A: 'À', E: 'È', I: 'Ì', O: 'Ò', U: 'Ù' },
      '^': { a: 'â', e: 'ê', i: 'î', o: 'ô', u: 'û', A: 'Â', E: 'Ê', I: 'Î', O: 'Ô', U: 'Û' },
      '"': { a: 'ä', e: 'ë', i: 'ï', o: 'ö', u: 'ü', y: 'ÿ', A: 'Ä', E: 'Ë', I: 'Ï', O: 'Ö', U: 'Ü', Y: 'Ÿ' },
      '~': { n: 'ñ', a: 'ã', o: 'õ', N: 'Ñ', A: 'Ã', O: 'Õ' },
      c: { c: 'ç', C: 'Ç' },
      v: { s: 'š', S: 'Š', c: 'č', C: 'Č', z: 'ž', Z: 'Ž' }
    };
    // handle accents like \'e or \'{e}
  // accept optional backslash inside braces, e.g. {\'\i}
  s = s.replace(/\\([`'\^\"~])\{?\\?([A-Za-z])\}?/g, function(_, acc, ch) {
      const table = accentMap[acc];
      if (table && table[ch]) return table[ch];
      // Try lowercase fallback
      if (table && table[ch.toLowerCase()]) {
        const out = table[ch.toLowerCase()];
        return ch === ch.toUpperCase() ? out.toUpperCase() : out;
      }
      return ch;
    });
    // handle commands like \c{c} and \v{s}
    s = s.replace(/\\([cv])\{?([A-Za-z])\}?/g, function(_, cmd, ch) {
      const table = accentMap[cmd];
      if (table && table[ch]) return table[ch];
      if (table && table[ch.toLowerCase()]) {
        const out = table[ch.toLowerCase()];
        return ch === ch.toUpperCase() ? out.toUpperCase() : out;
      }
      return ch;
    });
    // Remove math environments $...$ and \(...\)
    s = s.replace(/\$[^$]*\$/g, '');
    s = s.replace(/\\\([^)]*\\\)/g, '');
    // Replace LaTeX escaped ampersand and common escapes
    s = s.replace(/\\&/g, '&');
    // Replace non-breaking tilde with space
    s = s.replace(/~/g, ' ');
    // Dashes: --- -> em dash, -- -> en dash
    s = s.replace(/---/g, '—').replace(/--/g, '–');
    // Remove other backslash commands like \textsuperscript{...} -> content
    s = s.replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1');
    // Remove remaining backslashes before letters
    s = s.replace(/\\([a-zA-Z]+)/g, '$1');
    // Strip leftover braces
    s = s.replace(/[{}]/g, '');
  // Convert common math macros to symbols and unwrap simple math fonts
  s = s.replace(/\\(?:rightarrow|to)\b/g, '→');
  s = s.replace(/\\leftrightarrow\b/g, '↔');
  s = s.replace(/\\times\b/g, '×');
  s = s.replace(/\\pm\b/g, '±');
  s = s.replace(/\\cdot\b/g, '·');
  s = s.replace(/\\approx\b/g, '≈');
  s = s.replace(/\\ldots\b/g, '…');
  // handle numeric patterns like '3 \rightarrow 3'
  s = s.replace(/(\d)\s*(?:\\(?:rightarrow|to)|→|rightarrow)\s*(\d)/g, '$1→$2');
  // Unwrap common math font commands like \mathbf{...} -> content
  s = s.replace(/\\(?:mathbf|mathrm|mathit)\{([^}]*)\}/g, '$1');
  // Remove stray literal tokens left by aggressive backslash removals (e.g. 'mathbf')
  s = s.replace(/\b(?:mathbf|mathrm|mathit)\b\s*/g, '');
    // Escape HTML but allow <em> tags
    const openToken = '___EM_OPEN___';
    const closeToken = '___EM_CLOSE___';
    s = s.replace(/<em>/g, openToken).replace(/<\/em>/g, closeToken);
    s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
         .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    s = s.replace(new RegExp(openToken, 'g'), '<em>').replace(new RegExp(closeToken, 'g'), '</em>');
    return s.trim();
  }

  // Format authors: handle "Last, First" and "First Last" styles and join
  function formatAuthorName(name) {
    if (!name) return '';
    // sanitize small bits first
    let s = sanitizeBibtex(name);
    // collapse whitespace
    s = s.replace(/\s+/g, ' ').trim();
  // Helper: detect if token looks like an initial (single letter, with or without dot)
  const isInitial = (tok) => /^[A-Za-z]$/.test(tok) || /^[A-Za-z]\.$/.test(tok);
  const cleanToken = (t) => t.replace(/^\.+|\.+$/g, '').replace(/^\(|\)$/g, '').trim();

    // If 'Last, First' form, invert and normalize initials
    if (s.indexOf(',') >= 0) {
      const parts = s.split(',');
      const last = cleanToken(parts[0]);
      const firstPart = parts.slice(1).join(',').trim();
      const toks = firstPart.split(/\s+/).filter(Boolean).map(t => cleanToken(t));
      const firstNorm = toks.map(t => isInitial(t) ? (t.replace('.', '') + '.') : t).join(' ');
      return (firstNorm + ' ' + last).trim();
    }

    // Otherwise assume 'First Middle Last' style. Handle particles (van, von, de, etc.)
  const tokens = s.split(' ').filter(Boolean).map(t => cleanToken(t));
    if (tokens.length <= 1) return s;
    const lower = (t) => t.toLowerCase();
    const particles = new Set(['van','von','de','del','den','der','di','la','le','du','mc','mac','al']);
    // If the penultimate token is a particle, treat it as part of the last name
    let lastName = tokens[tokens.length - 1];
    let given = tokens.slice(0, tokens.length - 1);
    if (tokens.length >= 2 && particles.has(lower(tokens[tokens.length - 2]))) {
      lastName = tokens.slice(tokens.length - 2).join(' ');
      given = tokens.slice(0, tokens.length - 2);
    }
    // Normalize initials in given names
    const givenNorm = given.map(t => isInitial(t) ? (t.replace('.', '') + '.') : t).join(' ');
    return (givenNorm + ' ' + lastName).trim();
  }

  function formatAuthors(raw) {
  if (!raw) return '';
  // normalize common 'and others' variants to 'et al.'
  raw = raw.replace(/,?\s*(and\s+)?others\.?/i, ' et al.');
  // split on ' and ' (BibTeX separator)
  const parts = raw.split(/\s+and\s+/i).map(p => p.trim()).filter(Boolean);
    const names = parts.map(formatAuthorName).filter(Boolean);
    if (names.length === 0) return '';
    if (names.length === 1) return names[0];
    if (names.length === 2) return names[0] + ' and ' + names[1];
    return names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1];
  }

  let authors = formatAuthors(tags.author || '');
  // Title: sanitize and italicize
  let title = sanitizeBibtex(tags.title || '');
  // Venue: choose journal, booktitle, or school depending on entry type
  const venue = sanitizeBibtex(tags.journal || tags.booktitle || tags.school || '');
  // Pages if available
  const pages = tags.pages ? `, ${tags.pages}` : '';
  // Year parentheses
  const yearStr = tags.year ? ` (${tags.year})` : '';
  // DOI or URL link
  let link = '';
  if (tags.doi) {
    const doi = sanitizeBibtex(tags.doi.trim());
    link = `. <a href="https://doi.org/${doi}" target="_blank" rel="noopener">DOI</a>`;
  } else if (tags.url) {
    const url = sanitizeBibtex(tags.url.trim());
    // URL should be used as href raw (already sanitized for display)
    link = `. <a href="${url}" target="_blank" rel="noopener">link</a>`;
  }
  // Compose final citation string: title (normal) first, then venue/year/pages/link, authors last
  let citationParts = [];
  if (title) citationParts.push(title + '.');
  if (venue) citationParts.push(venue);
  if (yearStr) citationParts.push(yearStr);
  if (pages) citationParts.push(pages);
  const mainPart = citationParts.join(' ');
  const citation = mainPart + (link ? link : '');
  if (authors) {
    // show authors on their own line with a label
    return citation + ' <p class="pub-authors">Authors: ' + authors + '.</p>';
  }
  return citation;
}

