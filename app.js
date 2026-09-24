/* DEFORTHOCON 2026 — static, editable conference companion.
   Conference programme / committee: data.json
   Faculty names, programme roles, affiliations and session details: faculty_profiles.json
*/
(() => {
  'use strict';
  const state = { data: null, profiles: {}, day: 0, facultyQuery: '', installPrompt: null, dataFingerprint: '', brochureReturn: 'home' };
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const facultyEntries = () => Object.entries(state.profiles)
    .map(([name, details]) => ({ name, ...details }))
    .sort((a,b) => Number(a.order || 999) - Number(b.order || 999));
  const facultyCard = (person) => {
    const role = person.role || 'Conference faculty';
    const affiliation = person.affiliation || '';
    const topics = person.topics || '';
    return `<article class="faculty-card faculty-card-text">
      <div class="faculty-card-top"><div><h3>${esc(person.name)}</h3><p class="faculty-affiliation">${esc(affiliation)}</p></div><span class="faculty-role-badge">${esc(role)}</span></div>
      ${topics ? `<div class="faculty-topics"><span>Programme</span><p>${esc(topics)}</p></div>` : ''}
    </article>`;
  };
  const renderFaculty = () => {
    const q = state.facultyQuery.trim().toLocaleLowerCase();
    const entries = facultyEntries();
    const selected = entries.filter(p => (p.name + ' ' + (p.role || '') + ' ' + (p.affiliation || '') + ' ' + (p.topics || '')).toLocaleLowerCase().includes(q));
    $('faculty-list').innerHTML = selected.map(facultyCard).join('');
    $('faculty-empty').hidden = selected.length > 0;
    $('faculty-count').textContent = String(entries.length).padStart(2,'0');
  };
  const renderProgramme = () => {
    const day = state.data.days[state.day];
    $('programme-list').innerHTML = day.sessions.map(s => {
      const chairs = s.chairs.length ? `<div class="session-chairs"><strong>Chairpersons:</strong> ${s.chairs.map(esc).join(' · ')}</div>` : '';
      const entries = s.entries.map(e => {
        const speakerLine = e.speakers.length ? `<p>${e.speakers.map(esc).join(' / ')}</p>` : '';
        return `<div class="talk ${esc(e.kind || '')}"><time>${esc(e.time)}</time><div><h3>${esc(e.title)}</h3>${speakerLine}</div></div>`;
      }).join('');
      return `<article class="session-card"><div class="session-heading"><h2>${esc(s.title)}</h2><span>${esc(s.time)} h</span></div>${chairs}${entries}</article>`;
    }).join('');
    for (let i=0; i<2; i++) {
      const tab = $('tab-day-' + i);
      tab.classList.toggle('active', i === state.day);
      tab.setAttribute('aria-selected', String(i === state.day));
    }
  };
  const selectDay = (i) => {state.day=i; renderProgramme(); showScreen('programme');};
  const renderUpdates = () => {
    const notices = state.data.announcements || [];
    $('announcements-list').innerHTML = notices.map(n => `<article class="announcement">${n.date?`<time>${esc(n.date)}</time>`:''}<h2>${esc(n.heading)}</h2><p>${esc(n.message)}</p></article>`).join('');
  };
  const renderInfo = () => {
    const d = state.data;
    for (const id of ['registration-link', 'hero-register', 'header-register']) {
      $(id).href = d.registrationUrl;
    }
    $('maps-link').href = d.mapsUrl;
    $('committee-list').innerHTML = d.committee.map(c => `<section class="committee-item"><h3>${esc(c.role)}</h3>${c.names.map(n=>`<p>${esc(n)}</p>`).join('')}</section>`).join('');
    $('contact-list').innerHTML = d.contact.map(c => `<div class="contact-item"><span><strong>${esc(c.name)}</strong><small>${esc(c.role)}</small></span><a href="tel:${esc(c.tel.replace(/[^\d+]/g,''))}" aria-label="Call ${esc(c.name)}">Call ${esc(c.tel)}</a></div>`).join('');
  };
  const render = () => {renderProgramme();renderFaculty();renderUpdates();renderInfo();};
  const SCREENS = ['home','programme','faculty','updates','info','brochure'];
  const showScreen = (screen, focus = false) => {
    if (!SCREENS.includes(screen)) screen='home';
    for (const name of SCREENS) $('screen-'+name).classList.toggle('active',name === screen);
    document.querySelectorAll('.nav-item').forEach(el => {
      const active=el.dataset.screenTarget===screen;
      el.classList.toggle('active',active);
      if(active) el.setAttribute('aria-current','page'); else el.removeAttribute('aria-current');
    });
    window.scrollTo({top:0,behavior:'instant'});
    if(focus) $('screen-'+screen).querySelector('h1')?.focus?.();
  };
  const route = () => {
    const hash = location.hash.replace(/^#/, '');
    if (hash === 'registration') {
      showScreen('info');
      // Wait for the panel to become visible before locating it.
      requestAnimationFrame(() => $('registration').scrollIntoView({block:'start'}));
    } else showScreen(SCREENS.includes(hash) ? hash : 'home');
  };
  const loadJSON = async (path) => {
    const response = await fetch(path, { cache: 'no-store' });
    if(!response.ok) throw new Error(path + ': HTTP ' + response.status);
    return response.json();
  };
  const updateNow = async () => {
    const status = $('update-status');
    status.textContent = 'Checking published information…';
    try {
      const data = await loadJSON('data.json');
      const profiles = await loadJSON('faculty_profiles.json');
      const fingerprint = JSON.stringify(data) + JSON.stringify(profiles);
      if (fingerprint !== state.dataFingerprint) {
        state.data=data;state.profiles=profiles;state.dataFingerprint=fingerprint;render();
        status.textContent='Latest published information loaded.';
      } else status.textContent='You already have the latest published information.';
      if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistration().then(reg => reg?.update()).catch(()=>{});
    } catch(err) {
      status.textContent = 'Unable to check online. Previously loaded information remains available when cached.';
    }
  };
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true || new URLSearchParams(location.search).get('source') === 'installed';
  const deviceKind = () => {
    const ua=navigator.userAgent || '';
    const ios=/iPhone|iPad|iPod/i.test(ua) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
    const android=/Android/i.test(ua);
    if(ios) return 'ios';
    if(android) return 'android';
    return 'desktop';
  };
  const installDismissKey='deforthocon-install-guide-dismissed-v5';
  const installDismissMs=5*24*60*60*1000;
  const shouldSuggestInstall = () => {
    if(isStandalone()) return false;
    try {
      const dismissed=Number(localStorage.getItem(installDismissKey)||0);
      if(dismissed && Date.now()-dismissed<installDismissMs) return false;
    } catch(_) {}
    return deviceKind()!=='desktop' || !!state.installPrompt;
  };
  const setInstallGuideContent = () => {
    const kind=deviceKind();
    const steps=$('install-guide-steps');
    const primary=$('install-guide-primary');
    const intro=$('install-guide-text');
    if(kind==='ios') {
      intro.textContent='Save the conference companion to your Home Screen in three quick steps.';
      steps.innerHTML='<li>Tap the <strong>Share</strong> button in your browser.</li><li>Choose <strong>Add to Home Screen</strong>.</li><li>Tap <strong>Add</strong>.</li>';
      primary.textContent='Got it';
    } else if(state.installPrompt) {
      intro.textContent='Install the conference companion for quick access throughout the CME.';
      steps.innerHTML='<li>Tap <strong>Install app</strong> below.</li><li>Confirm <strong>Install</strong> in your browser.</li><li>Open DEFORTHOCON from your Home Screen.</li>';
      primary.textContent='Install app';
    } else if(kind==='android') {
      intro.textContent='Save the conference companion to your Home Screen in three quick steps.';
      steps.innerHTML='<li>Open the browser <strong>menu ⋮</strong>.</li><li>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li><li>Confirm <strong>Install</strong>.</li>';
      primary.textContent='Got it';
    } else {
      intro.textContent='Your browser can install this conference companion like an app.';
      steps.innerHTML='<li>Open your browser menu.</li><li>Choose <strong>Install app</strong>.</li><li>Confirm the installation.</li>';
      primary.textContent='Got it';
    }
  };
  const openInstallGuide = () => {
    if(!shouldSuggestInstall()) return;
    setInstallGuideContent();
    const guide=$('install-guide');
    guide.hidden=false;
    guide.setAttribute('aria-hidden','false');
    document.body.classList.add('install-guide-open');
    setTimeout(()=>$('install-guide-close').focus(),40);
  };
  const closeInstallGuide = (remember=true) => {
    const guide=$('install-guide');
    guide.hidden=true;
    guide.setAttribute('aria-hidden','true');
    document.body.classList.remove('install-guide-open');
    if(remember) { try {localStorage.setItem(installDismissKey,String(Date.now()));} catch(_) {} }
  };
  const triggerInstall = async () => {
    if(state.installPrompt) {
      const p=state.installPrompt; state.installPrompt=null;
      p.prompt();
      try { await p.userChoice; } catch(_) {}
      closeInstallGuide(true);
    } else {
      closeInstallGuide(true);
    }
  };
  const setupInstall = () => {
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault(); state.installPrompt=e;
      $('install-help').textContent='Tap Install app to add DEFORTHOCON to your home screen.';
      setInstallGuideContent();
    });
    window.addEventListener('appinstalled',()=>{ state.installPrompt=null; closeInstallGuide(false); });
    $('install-button').addEventListener('click',async()=>{
      if(state.installPrompt) await triggerInstall();
      else {
        const kind=deviceKind();
        $('install-help').textContent=kind==='ios'
          ? 'Tap Share → Add to Home Screen → Add.'
          : 'Open the browser menu → Install app or Add to Home screen → confirm Install.';
        try { localStorage.removeItem(installDismissKey); } catch(_) {}
        openInstallGuide();
      }
    });
    $('install-guide-close').addEventListener('click',()=>closeInstallGuide(true));
    $('install-guide-later').addEventListener('click',()=>closeInstallGuide(true));
    document.querySelectorAll('[data-install-dismiss]').forEach(el=>el.addEventListener('click',()=>closeInstallGuide(true)));
    $('install-guide-primary').addEventListener('click',triggerInstall);
    document.addEventListener('keydown',e=>{ if(e.key==='Escape' && !$('install-guide').hidden) closeInstallGuide(true); });
    if(!isStandalone()) setTimeout(openInstallGuide,2200);
  };
  const setup = () => {
    $('home-logo').addEventListener('click',()=>{location.hash='home';route();});
    document.querySelectorAll('[data-screen-target]').forEach(el=>el.addEventListener('click',()=>{location.hash=el.dataset.screenTarget;route();}));
    document.querySelectorAll('[data-open-brochure]').forEach(el=>el.addEventListener('click',()=>{
      const here = location.hash.replace(/^#/, '');
      state.brochureReturn = here === 'info' ? 'info' : 'home';
    }));
    const closeBrochure = () => { location.hash = state.brochureReturn || 'home'; route(); };
    $('brochure-back').addEventListener('click',closeBrochure);
    $('brochure-close-bottom').addEventListener('click',closeBrochure);
    const toggleBrochureZoom = () => {
      const zoomed = $('brochure-pages').classList.toggle('zoomed');
      $('brochure-zoom').textContent = zoomed ? 'Fit −' : 'Zoom +';
      $('brochure-zoom').setAttribute('aria-pressed',String(zoomed));
      if (!zoomed) $('brochure-canvas').scrollLeft = 0;
    };
    $('brochure-zoom').addEventListener('click',toggleBrochureZoom);
    document.querySelectorAll('.brochure-page img').forEach(img => img.addEventListener('click',toggleBrochureZoom));

    document.querySelectorAll('[data-screen-link]').forEach(el=>el.addEventListener('click',()=>{showScreen(el.dataset.screenLink);}));
    document.querySelectorAll('[data-open-day]').forEach(el=>el.addEventListener('click',()=>{state.day=Number(el.dataset.openDay);renderProgramme();location.hash='programme';route();}));
    document.querySelectorAll('[data-day]').forEach(el=>el.addEventListener('click',()=>selectDay(Number(el.dataset.day))));
    $('faculty-search').addEventListener('input',e=>{state.facultyQuery=e.target.value;renderFaculty();});
    $('check-updates').addEventListener('click',updateNow);
    window.addEventListener('hashchange',route);
    setupInstall();
  };
  const init = async () => {
    setup();
    try {
      const [data,profiles] = await Promise.all([loadJSON('data.json'),loadJSON('faculty_profiles.json')]);
      state.data=data;state.profiles=profiles;state.dataFingerprint=JSON.stringify(data)+JSON.stringify(profiles);
      render();route();
    } catch(err) {
      console.error('Conference information unavailable:',err);
      $('programme-list').innerHTML='<p class="empty-state">Could not load the programme. Please check your connection and reload.</p>';
      $('faculty-list').innerHTML='<p class="empty-state">Faculty information is temporarily unavailable.</p>';
      $('update-status').textContent='App data could not be loaded. Please reconnect and refresh.';
      route();
    }
    if ('serviceWorker' in navigator && (location.protocol==='https:' || location.hostname==='localhost')) {
      window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('Offline support unavailable:',err)));
    }
  };
  init();
})();
