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
    const getParser = () => {
      if (typeof bibtexParse !== 'undefined' && bibtexParse && typeof bibtexParse.toJSON === 'function') {
        return bibtexParse;
      }
      if (typeof exports !== 'undefined' && exports && typeof exports.toJSON === 'function') {
        if (typeof window !== 'undefined') {
          window.bibtexParse = exports;
        }
        return exports;
      }
      return null;
    };

    return new Promise((resolve, reject) => {
      if (getParser()) return resolve();

      // If a script tag for bibtexParse.js exists, wait a short time for it to initialize
      const existing = Array.from(document.getElementsByTagName('script')).find(
        (s) => s.src && s.src.includes('bibtexParse.js')
      );
      if (existing) {
        const checkInterval = setInterval(() => {
          if (getParser()) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 50);
        // timeout after 2s
        setTimeout(() => {
          if (getParser()) return;
          clearInterval(checkInterval);
          reject(new Error('bibtexParse did not initialize'));
        }, 2000);
        return;
      }

      // Otherwise dynamically insert the script
      const script = document.createElement('script');
      script.src = 'js/bibtexParse.js';
      script.onload = () => {
        if (getParser()) {
          resolve();
        } else {
          reject(new Error('bibtexParse loaded but did not initialize'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load js/bibtexParse.js'));
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
  // Authors: replace ' and ' with ', ' and remove extraneous braces
  let authors = (tags.author || '').replace(/\s+and\s+/g, ', ');
  authors = authors.replace(/[{}]/g, '');
  // Keep author names as-is (no bolding applied)
  // Title: remove outer braces and trim
  let title = (tags.title || '').replace(/[{}]/g, '');
  // Italicize the title in HTML
  title = `<em>${title}</em>`;
  // Venue: choose journal, booktitle, or school depending on entry type
  const venue = tags.journal || tags.booktitle || tags.school || '';
  // Pages if available
  const pages = tags.pages ? `, ${tags.pages}` : '';
  // Year parentheses
  const yearStr = tags.year ? ` (${tags.year})` : '';
  // DOI or URL link
  let link = '';
  if (tags.doi) {
    const doi = tags.doi.trim();
    link = `. <a href="https://doi.org/${doi}" target="_blank" rel="noopener">DOI</a>`;
  } else if (tags.url) {
    const url = tags.url.trim();
    link = `. <a href="${url}" target="_blank" rel="noopener">link</a>`;
  }
  // Compose final citation string
  let citationParts = [];
  if (authors) citationParts.push(`${authors}.`);
  if (title) citationParts.push(title);
  if (venue) citationParts.push(venue);
  if (yearStr) citationParts.push(yearStr);
  if (pages) citationParts.push(pages);
  const citation = citationParts.join(' ') + link;
  return citation;
}

