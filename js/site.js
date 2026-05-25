// Shared site behaviour: responsive nav, typed hero text, footer year.
document.addEventListener('DOMContentLoaded', () => {
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
  }

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const typedTextElement = document.getElementById('typed-text');
  if (typedTextElement) {
    const typedPhrases = [
      'artificial intelligence',
      'quantum computing',
      'AI for science',
      'scientific ML'
    ];
    let currentPhraseIndex = 0;
    let charIndex = 0;
    const typingDelay = 45;
    const erasingDelay = 25;
    const newPhraseDelay = 900;

    function type() {
      const phrase = typedPhrases[currentPhraseIndex];
      if (charIndex < phrase.length) {
        typedTextElement.textContent += phrase.charAt(charIndex);
        charIndex++;
        setTimeout(type, typingDelay);
      } else {
        setTimeout(erase, newPhraseDelay);
      }
    }
    function erase() {
      const phrase = typedPhrases[currentPhraseIndex];
      if (charIndex > 0) {
        typedTextElement.textContent = phrase.substring(0, charIndex - 1);
        charIndex--;
        setTimeout(erase, erasingDelay);
      } else {
        currentPhraseIndex = (currentPhraseIndex + 1) % typedPhrases.length;
        setTimeout(type, typingDelay);
      }
    }
    setTimeout(type, 400);
  }
});
