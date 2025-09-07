// main.js
// Fetch and parse BibTeX file, then render publication list

// Single DOMContentLoaded handler for page initialisation
document.addEventListener('DOMContentLoaded', () => {
  // Responsive nav toggle
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
  }

  // Path to the BibTeX file relative to index.html
  const bibPath = 'data/biblio.bib';
  fetch(bibPath)
    .then((res) => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.text();
    })
    .then((bibText) => {
      // Parse the BibTeX content into JSON entries
      const entries = bibtexParse.toJSON(bibText || '');
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
      if (filtered.length === 0) {
        const container = document.getElementById('publications-container');
        if (container) container.innerHTML = '<p class="warning">No publications found in the BibTeX file.</p>';
      } else {
        renderPublications(filtered);
      }
    })
    .catch((err) => {
      console.error('Failed to load BibTeX file:', err);
      const container = document.getElementById('publications-container');
      if (container) {
        container.innerHTML = '<p class="warning">Unable to load publications. Please ensure this website is served over a web server for the publications list to appear.</p>';
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

// Typed text effect for the hero tagline.  This listener runs after the DOM
// content has loaded and cycles through a list of phrases.  It types each
// phrase character by character and then erases it before moving on to
// the next.  To customise the effect, modify the `typedPhrases` array
// and timing constants below.
document.addEventListener('DOMContentLoaded', () => {
  const typedPhrases = [
    'quantum many‑body physics',
    'machine learning',
    'high‑performance computing'
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
});