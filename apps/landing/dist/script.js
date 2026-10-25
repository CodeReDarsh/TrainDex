const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');

menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  navigation.classList.toggle('open', open);
});

navigation.addEventListener('click', (event) => {
  if (event.target.closest('a')) {
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open navigation');
    navigation.classList.remove('open');
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
    menuButton.click();
    menuButton.focus();
  }
});

const examples = {
  'six-local': {
    description: 'A green circle, a white 6, and a familiar face on the Lexington Avenue line. Sometimes the everyday ones are the best place to start.',
    shape: 'CIRCLE / LOCAL',
  },
  'six-express': {
    description: 'Same number. A different outline. The green diamond distinguishes the Pelham Express reference bullet from its circular local counterpart.',
    shape: 'DIAMOND / EXPRESS',
  },
  'seven-express': {
    description: 'A purple diamond for the Flushing Express. A tiny change in the outline tells a different story about the ride.',
    shape: 'DIAMOND / EXPRESS',
  },
  a: {
    description: 'The blue A: an Eighth Avenue Express icon. A simple circle and a single letter, with plenty of design history behind them.',
    shape: 'CIRCLE / EXPRESS',
  },
};

for (const card of document.querySelectorAll('.dex-card')) {
  card.addEventListener('click', () => {
    const example = examples[card.dataset.design];
    if (!example) return;
    for (const other of document.querySelectorAll('.dex-card')) {
      const selected = other === card;
      other.classList.toggle('selected', selected);
      other.setAttribute('aria-pressed', String(selected));
    }
    document.querySelector('#design-description').textContent = example.description;
    document.querySelector('#design-shape').textContent = example.shape;
  });
}
