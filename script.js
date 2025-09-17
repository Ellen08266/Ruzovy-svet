// Toggle mobilního menu
const navToggle = document.querySelector('.nav__toggle');
const navLinks = document.querySelector('.nav__links');
if (navToggle) {
  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('is-open');
  });
}

// Rok ve footeru
document.getElementById('year').textContent = new Date().getFullYear();

// -------------------- Příběhy (localStorage mini-blog) --------------------
const storiesKey = 'pinkStories';
const storiesList = document.getElementById('storiesList');
const newStoryBtn = document.getElementById('newStoryBtn');
const storyModal = document.getElementById('storyModal');
const storyForm = document.getElementById('storyForm');

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
    storiesList.innerHTML = `
      <div class="card">
        <p class="muted">Zatím tu není žádný příběh. Přidej první kliknutím na <strong>+ Přidat příběh</strong> 👍</p>
      </div>`;
    return;
  }
  stories
    .sort((a,b) => b.created - a.created)
    .forEach((s, idx) => {
      const card = document.createElement('article');
      card.className = 'card story';
      card.innerHTML = `
        <h3>${escapeHtml(s.title)}</h3>
        <time datetime="${new Date(s.created).toISOString()}">${formatDate(s.created)}</time>
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
  return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function formatDate(ts){
  const d = new Date(ts);
  return d.toLocaleDateString('cs-CZ', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' });
}

// Otevřít modal
if (newStoryBtn && storyModal) {
  newStoryBtn.addEventListener('click', () => storyModal.showModal());
}

// Submit příběhu
if (storyForm) {
  storyForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(storyForm);
    const title = (data.get('title')+'').trim();
    const body = (data.get('body')+'').trim();
    if(!title || !body){ storyModal.close(); return; }

    const raw = localStorage.getItem(storiesKey);
    const stories = raw ? JSON.parse(raw) : [];

    // Pokud upravujeme existující
    const editingId = storyForm.dataset.editingId;
    if (editingId) {
      const idx = stories.findIndex(s => s.id === editingId);
      if (idx > -1) {
        stories[idx].title = title;
        stories[idx].body = body;
      }
      delete storyForm.dataset.editingId;
    } else {
      stories.push({ id: crypto.randomUUID(), title, body, created: Date.now() });
    }

    saveStories(stories);
    loadStories();
    storyForm.reset();
    storyModal.close();
  });
}

// Edit/Smazat
storiesList?.addEventListener('click', (e) => {
  const editId = e.target.dataset.edit;
  const delId = e.target.dataset.del;
  const raw = localStorage.getItem(storiesKey);
  const stories = raw ? JSON.parse(raw) : [];

  if (editId) {
    const item = stories.find(s => s.id === editId);
    if (!item) return;
    storyForm.title.value = item.title;
    storyForm.body.value = item.body;
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

// -------------------- Lightbox galerie --------------------
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
lightbox?.addEventListener('click', (e) => {
  if (e.target === lightbox) lightbox.close();
});
