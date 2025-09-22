// Toggle mobilního menu
const navToggle = document.querySelector('.nav__toggle');
const navLinks = document.querySelector('.nav__links');
if (navToggle) {
  navToggle.addEventListener('click', () => navLinks.classList.toggle('is-open'));
}

// Rok ve footeru
document.getElementById('year').textContent = new Date().getFullYear();

/* -------------------- Příběhy (localStorage + fotka/video) -------------------- */
const storiesKey = 'pinkStories';
const storiesList = document.getElementById('storiesList');
const newStoryBtn = document.getElementById('newStoryBtn');
const storyModal = document.getElementById('storyModal');
const storyForm = document.getElementById('storyForm');
const mediaInput = storyForm?.querySelector('input[name="media"]');
const mediaPreview = document.getElementById('mediaPreview');

function loadStories() {
  const raw = localStorage.getItem(storiesKey);
  let stories = [];
  try { stories = raw ? JSON.parse(raw) : []; } catch { stories = []; }
  renderStories(stories);
}
function saveStories(stories) {
  localStorage.setItem(storiesKey, JSON.stringify(stories));
}
function renderStories(stories) {
  storiesList.innerHTML = '';
  if (!stories.length) {
    storiesList.innerHTML = `<div class="card"><p class="muted">Zatím tu není žádný příběh. Přidej první kliknutím na <strong>+ Přidat příběh</strong> 👍</p></div>`;
    return;
  }
  stories.sort((a,b) => b.created - a.created).forEach((s) => {
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

function escapeHtml(str){ return (str??'').toString().replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

// Otevřít modal
newStoryBtn?.addEventListener('click', () => {
  storyForm.reset();
  delete storyForm.dataset.editingId;
  if (mediaPreview) mediaPreview.textContent = 'Žádné médium nevybráno.';
  storyModal.showModal();
});

// Náhled média (fotka/video) před uložením
mediaInput?.addEventListener('change', () => {
  const file = mediaInput.files?.[0];
  if (!file) { mediaPreview.textContent = 'Žádné médium nevybráno.'; return; }
  mediaPreview.textContent = `Vybráno: ${file.name}`;
});

// Submit příběhu
storyForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = new FormData(storyForm);
  const title = (data.get('title')+'').trim();
  const body = (data.get('body')+'').trim();
  if(!title || !body){ storyModal.close(); return; }

  const raw = localStorage.getItem(storiesKey);
  const stories = raw ? JSON.parse(raw) : [];

  // Přečíst případný soubor jako DataURL (DEMO)
  let media = null;
  const file = mediaInput?.files?.[0];
  if (file) {
    const src = await readFileAsDataURL(file);
    media = { src, kind: file.type.startsWith('video') ? 'video' : 'image', name: file.name, type: file.type };
  }

  const editingId = storyForm.dataset.editingId;
  if (editingId) {
    const idx = stories.findIndex(s => s.id === editingId);
    if (idx > -1) {
      stories[idx].title = title;
      stories[idx].body = body;
      if (media) stories[idx].media = media;
    }
    delete storyForm.dataset.editingId;
  } else {
    stories.push({ id: crypto.randomUUID(), title, body, created: Date.now(), media });
  }

  saveStories(stories);
  loadStories();
  storyForm.reset();
  if (mediaPreview) mediaPreview.textContent = 'Žádné médium nevybráno.';
  storyModal.close();
});

function readFileAsDataURL(file){
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

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
    if (mediaPreview) mediaPreview.textContent = item.media?.name ? `Aktuální: ${item.media.name}` : 'Žádné médium neuloženo.';
    storyForm.dataset.editingId = editId;
    storyModal.showModal();
  }
  if (delId) {
    const filtered = stories.filter(s => s.id !== delId);
    saveStories(filtered);
    loadStories();
  }
});

loadStories();

/* -------------------- Lightbox galerie -------------------- */
const galleryImgs = document.querySelectorAll('.gallery__item');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxClose = document.querySelector('.lightbox__close');

galleryImgs.forEach(img => {
  img.addEventListener('click', () => {
    lightboxImg.src = img.src;
    lightbox.showModal();
  });
});
lightboxClose?.addEventListener('click', () => lightbox.close());
lightbox?.addEventListener('click', (e) => { if (e.target === lightbox) lightbox.close(); });

/* -------------------- FILTR galerie -------------------- */
const filterBtns = document.querySelectorAll('.filter');
const galleryGrid = document.getElementById('galleryGrid');

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.filter;
    filterBtns.forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');

    const items = galleryGrid.querySelectorAll('.gallery__item');
    items.forEach(el => {
      const cat = el.dataset.cat;
      const match = (target === 'all') || (cat === target);
      el.style.display = match ? '' : 'none';
    });
  });
});
