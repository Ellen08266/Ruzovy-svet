// === Růžový svět – Script v3 (stories s výměnou/odebráním média, filtr, lightbox) ===

// Toggle mobilního menu
const navToggle = document.querySelector('.nav__toggle');
const navLinks = document.querySelector('.nav__links');
if (navToggle) {
  navToggle.addEventListener('click', () => navLinks.classList.toggle('is-open'));
}

// Rok ve footeru
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* -------------------- Příběhy (localStorage + fotka/video) -------------------- */
const storiesKey = 'pinkStories';
const storiesList = document.getElementById('storiesList');
const newStoryBtn = document.getElementById('newStoryBtn');
const storyModal = document.getElementById('storyModal');
const storyForm = document.getElementById('storyForm');
const mediaInput = storyForm?.querySelector('input[name="media"]');
const mediaPreview = document.getElementById('mediaPreview');
const removeMediaChk = document.getElementById('removeMedia'); // volitelný checkbox (může být null)

// Jednorázový seed demo příběhů (pokud ještě nic není)
(function seedStories(){
  try{
    const raw = localStorage.getItem(storiesKey);
    if (!raw) {
      const demo = [
        { id: crypto.randomUUID(), title: "Růžový běh v parku", body: "Dneska lehký trénink a pak frappé s holkama. Slunce, smích a pohoda!",
          created: Date.now()-1000*60*60*24*3, media: {src:"assets/gallery-2.jpg", kind:"image", name:"atletika.jpg", type:"image/jpeg"} },
        { id: crypto.randomUUID(), title: "Košíkářský chill", body: "Nový malý košík z proutí – růžová mašle!",
          created: Date.now()-1000*60*60*36, media: {src:"assets/gallery-3.jpg", kind:"image", name:"kosik.jpg", type:"image/jpeg"} },
        { id: crypto.randomUUID(), title: "Víkendový výlet", body: "Objevily jsme kavárnu s nejlepším cheesecakem. 10/10.",
          created: Date.now()-1000*60*60*6, media: {src:"assets/gallery-1.jpg", kind:"image", name:"vylety.jpg", type:"image/jpeg"} },
      ];
      localStorage.setItem(storiesKey, JSON.stringify(demo));
    }
  }catch(e){ /* ignore */ }
})();

function loadStories() {
  const raw = localStorage.getItem(storiesKey);
  let stories = [];
  try { stories = raw ? JSON.parse(raw) : []; } catch { stories = []; }
  renderStories(stories);
}

function saveStories(stories) {
  try {
    localStorage.setItem(storiesKey, JSON.stringify(stories));
    return true;
  } catch (e) {
    console.error('Uložení selhalo', e);
    alert('Uložení se nepovedlo – pravděpodobně je příliš velké médium. Zkus menší fotku/video.');
    return false;
  }
}

function renderStories(stories) {
  if (!storiesList) return;
  storiesList.innerHTML = '';
  if (!stories.length) {
    storiesList.innerHTML = `<div class="card"><p class="muted">Zatím tu není žádný příběh. Přidej první kliknutím na <strong>+ Přidat příběh</strong> 👍</p></div>`;
    return;
  }
  stories
    .sort((a,b) => b.created - a.created)
    .forEach((s) => {
      const card = document.createElement('article');
      card.className = 'card story';
      const dateIso = new Date(s.created).toISOString();
      const dateLabel = new Date(s.created).toLocaleDateString('cs-CZ', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' });

      let mediaHtml = '';
      if (s.media && s.media.src && s.media.kind === 'image') {
        mediaHtml = `<img class="story-media" src="${s.media.src}" alt="">`;
      } else if (s.media && s.media.src && s.media.kind === 'video') {
        mediaHtml = `<video class="story-media" controls src="${s.media.src}"></video>`;
      }

      card.innerHTML = `
        <h3>${escapeHtml(s.title)}</h3>
        <time datetime="${dateIso}">${dateLabel}</time>
        ${mediaHtml}
        <p>${escapeHtml(s.body)}</p>
        <div style="display:flex; gap:8px;">
          <button class="btn btn--small" data-edit="${s.id}">Upravit</button>
          <button class="btn btn--small btn--ghost" data-del="${s.id}">Smazat</button>
        </div>
      `;
      storiesList.appendChild(card);
    });
}

function escapeHtml(str){
  return (str??'').toString().replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// Otevřít modal – nový příběh
newStoryBtn?.addEventListener('click', () => {
  storyForm.reset();
  delete storyForm.dataset.editingId;
  if (mediaPreview) mediaPreview.textContent = 'Žádné médium nevybráno.';
  if (mediaInput) mediaInput.value = '';
  if (removeMediaChk) removeMediaChk.checked = false;
  storyModal.showModal();
});

// Náhled zvolené fotky/videa (jen textově)
mediaInput?.addEventListener('change', () => {
  const file = mediaInput.files?.[0];
  if (!file) { if (mediaPreview) mediaPreview.textContent = 'Žádné médium nevybráno.'; return; }
  if (mediaPreview) mediaPreview.textContent = `Vybráno: ${file.name}`;
});

// Uložení (nový / editace)
storyForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = new FormData(storyForm);
  const title = (data.get('title')+'').trim();
  const body = (data.get('body')+'').trim();
  if(!title || !body){ storyModal.close(); return; }

  const raw = localStorage.getItem(storiesKey);
  const stories = raw ? JSON.parse(raw) : [];

  // Připrav médium – pokud je vybrán nový soubor
  let newMedia = null;
  const file = mediaInput?.files?.[0];
  if (file) {
    if (file.type.startsWith('image/')) {
      // zmenšíme a uložíme jako JPEG pro menší velikost
      newMedia = await resizeImageToDataURL(file, 1600, 0.8);
    } else {
      const src = await readFileAsDataURL(file);
      newMedia = { src, kind: 'video', name: file.name, type: file.type };
    }
  }

  const editingId = storyForm.dataset.editingId;
  if (editingId) {
    const idx = stories.findIndex(s => s.id === editingId);
    if (idx > -1) {
      stories[idx].title = title;
      stories[idx].body = body;

      if (removeMediaChk?.checked) {
        // výslovně odebrat
        delete stories[idx].media;
      } else if (newMedia) {
        // nahradit novým
        stories[idx].media = newMedia;
      }
      // jinak ponecháme původní médium beze změny
    }
    delete storyForm.dataset.editingId;
  } else {
    stories.push({ id: crypto.randomUUID(), title, body, created: Date.now(), media: newMedia });
  }

  if (!saveStories(stories)) return; // selhalo uložení (např. moc velký soubor)

  loadStories();
  storyForm.reset();
  if (mediaPreview) mediaPreview.textContent = 'Žádné médium nevybráno.';
  if (removeMediaChk) removeMediaChk.checked = false;
  storyModal.close();
});

// Edit/Smazat
storiesList?.addEventListener('click', (e) => {
  const editId = e.target.dataset?.edit;
  const delId = e.target.dataset?.del;
  const raw = localStorage.getItem(storiesKey);
  const stories = raw ? JSON.parse(raw) : [];

  if (editId) {
    const item = stories.find(s => s.id === editId);
    if (!item) return;
    storyForm.title.value = item.title ?? '';
    storyForm.body.value = item.body ?? '';
    if (mediaPreview) mediaPreview.textContent = item.media?.name ? `Aktuální: ${item.media.name}` : (item.media?.src ? 'Uloženo médium (bez názvu)' : 'Žádné médium neuloženo.');
    if (mediaInput) mediaInput.value = ''; // vyčistit, aby šlo zvolit stejný název souboru znovu
    if (removeMediaChk) removeMediaChk.checked = false;
    storyForm.dataset.editingId = editId;
    storyModal.showModal();
  }
  if (delId) {
    const filtered = stories.filter(s => s.id !== delId);
    if (!saveStories(filtered)) return;
    loadStories();
  }
});

loadStories();

/* ---- Pomocné funkce pro práci se soubory ---- */
function readFileAsDataURL(file){
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

async function resizeImageToDataURL(file, maxSize = 1600, quality = 0.8) {
  const dataURL = await readFileAsDataURL(file);
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataURL;
  });
  const { width, height } = img;
  const scale = Math.min(1, maxSize / Math.max(width, height));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);

  // export jako JPEG (menší velikost, kvalitní pro web)
  const out = canvas.toDataURL('image/jpeg', quality);
  return { src: out, kind: 'image', name: file.name, type: 'image/jpeg' };
}

/* -------------------- Lightbox galerie -------------------- */
const galleryImgs = document.querySelectorAll('.gallery__item');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxClose = document.querySelector('.lightbox__close');

galleryImgs.forEach(img => {
  img.addEventListener('click', () => {
    if (!lightboxImg || !lightbox) return;
    lightboxImg.src = img.src;
    lightbox.showModal();
  });
});
lightboxClose?.addEventListener('click', () => lightbox?.close());
lightbox?.addEventListener('click', (e) => { if (e.target === lightbox) lightbox.close(); });

/* -------------------- FILTR galerie -------------------- */
const filterBtns = document.querySelectorAll('.filter');
const galleryGrid = document.getElementById('galleryGrid');

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.filter;
    filterBtns.forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');

    const items = galleryGrid?.querySelectorAll('.gallery__item') ?? [];
    items.forEach(el => {
      const cat = el.dataset.cat;
      const match = (target === 'all') || (cat === target);
      el.style.display = match ? '' : 'none';
    });
  });
});
