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
  'q-orange': {
    description: 'An orange Q for a different Manhattan route: Sixth Avenue instead of Broadway.',
    shape: 'CIRCLE / SIXTH AVENUE',
    history: {
      years: '1988–2001, with temporary reroutes.',
      route: '57th Street–Sixth Avenue, later 21st Street–Queensbridge, to Brighton Beach via Sixth Avenue, the Manhattan Bridge, and the Brighton Line.',
      purpose: 'The bridge’s south tracks closed for reconstruction, sending the Q over the north tracks to Sixth Avenue. Orange identified its Manhattan trunk line.',
      ended: 'On July 22, 2001, the south tracks reopened and the north tracks closed. The Q returned to Broadway with yellow bullets.',
      source: 'https://erausa.org/pdf/bulletin/2000s/2008/2008-12-bulletin.pdf#page=4',
      sourceLabel: 'History source: Electric Railroaders’ Association ↗',
    },
  },
  'six-express': {
    description: 'A green diamond marks the Pelham Express: a faster Bronx ride with local stops in Manhattan.',
    shape: 'DIAMOND / EXPRESS',
    history: {
      years: '1946–present. Pelham peak-direction express service began October 14, 1946; the green diamond design came later.',
      route: 'Pelham Bay Park, Bronx, to Brooklyn Bridge–City Hall, Manhattan. Weekday express service runs in the Bronx toward Manhattan in the morning and toward Pelham Bay Park in the afternoon and evening; Manhattan stops are local.',
      purpose: 'To shorten the trip for Pelham Bay riders using the Bronx middle track in the busiest direction. The original express pattern saved about eight minutes.',
      purposeLabel: 'Why it exists',
      ended: 'Still operating as scheduled weekday peak-direction express service. There is no permanent termination date; other periods use the local service pattern.',
      endedLabel: 'Current status',
      source: 'https://en.wikipedia.org/wiki/6_(New_York_City_Subway_service)#Under_the_New_York_City_Board_of_Transportation',
      sourceLabel: 'History source: 6 service history ↗',
      timetable: 'https://www.mta.info/schedules/subway/6-train',
    },
  },
  'seven-express': {
    description: 'A purple diamond marks the Flushing Express, with roots in the 1939 World’s Fair.',
    shape: 'DIAMOND / EXPRESS',
    history: {
      years: '1939–present, with interruptions. Flushing express service began April 24, 1939; the purple diamond design came later.',
      route: 'Usual route: Flushing–Main Street, Queens, to 34th Street–Hudson Yards, Manhattan. Weekday trains run express in Queens toward Manhattan in the morning and toward Flushing in the afternoon and evening.',
      purpose: 'Express service began to carry World’s Fair crowds using the Flushing Line’s middle track. Today it gives Queens riders a faster trip in the busiest direction.',
      purposeLabel: 'Why it exists',
      ended: 'Still operating as scheduled weekday peak-direction express service. Past suspensions and construction reroutes have changed the pattern, with no permanent termination of the express service.',
      endedLabel: 'Current status',
      source: 'https://erausa.org/pdf/bulletin/2000s/2009/2009-04-bulletin.pdf#page=8',
      sourceLabel: 'History source: Electric Railroaders’ Association ↗',
      timetable: 'https://www.mta.info/schedules/subway/7-train',
    },
  },
  'b-yellow': {
    description: 'A yellow B for the southern half of a route split by Manhattan Bridge repairs.',
    shape: 'CIRCLE / BROADWAY',
    history: {
      years: '1986–1988.',
      route: 'Coney Island–Stillwell Avenue via West End, Fourth Avenue, the Manhattan Bridge, and Broadway. Circle-B trips served Queensboro Plaza, with evenings and weekends cut back to 57th Street–Seventh Avenue in 1987. Rush-hour Astoria trips used a diamond B.',
      purpose: 'Closing the bridge’s north tracks cut off the B’s Sixth Avenue connection. The southern service ran via Broadway and used its yellow color.',
      ended: 'On December 11, 1988, the north tracks reopened. The B’s northern and southern sections reunited via Sixth Avenue, restoring the orange bullet.',
      source: 'https://en.wikipedia.org/wiki/B_(New_York_City_Subway_service)#Manhattan_Bridge_reconstruction_(1986_to_2004)',
      sourceLabel: 'History source: B service history ↗',
    },
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
    const history = document.querySelector('#service-history');
    history.hidden = !example.history;
    if (example.history) {
      for (const field of ['years', 'route', 'purpose', 'ended']) {
        document.querySelector(`#history-${field}`).textContent = example.history[field];
      }
      document.querySelector('#history-purpose-label').textContent = example.history.purposeLabel || 'Why it existed';
      document.querySelector('#history-ended-label').textContent = example.history.endedLabel || 'Why this version ended';
      const source = document.querySelector('#history-source');
      source.href = example.history.source;
      source.textContent = example.history.sourceLabel;
      const timetable = document.querySelector('#history-timetable');
      timetable.hidden = !example.history.timetable;
      if (example.history.timetable) timetable.href = example.history.timetable;
    }
  });
}
