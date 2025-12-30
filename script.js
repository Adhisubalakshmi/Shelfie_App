let wardrobe = [];
let idCounter = 1;
let lastSuggestedId = null;
const $ = id => document.getElementById(id);

// Load saved data from localStorage
window.onload = () => {
  const saved = localStorage.getItem("wardrobe");
  if (saved) {
    wardrobe = JSON.parse(saved);
    idCounter = wardrobe.length ? Math.max(...wardrobe.map(i => i.id)) + 1 : 1;
    renderWardrobe();
  }
};

function saveWardrobe() {
  localStorage.setItem("wardrobe", JSON.stringify(wardrobe));
}

/* ---------- rendering ---------- */
function renderWardrobe(list = wardrobe) {
  const div = $('wardrobe');
  div.innerHTML = '';
  if (list.length === 0) {
    div.innerHTML = '<p style="opacity:0.8">No items yet — add a cloth to start.</p>';
    return;
  }
  list.forEach(it => {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
      <img src="${it.imgURL}" alt="${it.name}" style="width:120px;height:120px;object-fit:cover;border-radius:10px;box-shadow:0 2px 5px rgba(0,0,0,0.3);">
      <div style="font-weight:700">${it.name}</div>
      <div style="font-size:0.9rem;color:#555">${it.type} • ${humanizeOccasion(it.occasion)}</div>
      <div style="margin-top:6px">Worn: <strong id="worn-${it.id}">${it.worn}</strong></div>
      <div style="margin-top:8px">
        <button class="small-btn" onclick="markWorn(${it.id})">Mark Worn</button>
        <button class="small-btn" onclick="editWorn(${it.id})">Edit</button>
        <button class="small-btn" onclick="removeCloth(${it.id})">Remove</button>
      </div>
    `;
    div.appendChild(card);
  });
  updateStats();
  saveWardrobe();
}

function humanizeOccasion(o) {
  if (o === 'casual') return 'Casual outing';
  if (o === 'temple') return 'Temple Function';
  return o.charAt(0).toUpperCase() + o.slice(1);
}

function updateStats() {
  const statsDiv = $('stats');
  if (!statsDiv) return;
  if (wardrobe.length === 0) { statsDiv.innerHTML = 'No clothes yet.'; return; }
  const total = wardrobe.length;
  const unworn = wardrobe.filter(x => x.worn === 0).length;
  const maxWorn = Math.max(...wardrobe.map(x => x.worn));
  const mostWorn = wardrobe.filter(x => x.worn === maxWorn).map(x => x.name);
  const minWorn = Math.min(...wardrobe.map(x => x.worn));
  const leastWorn = wardrobe.filter(x => x.worn === minWorn).map(x => x.name);
  statsDiv.innerHTML = `Total: <strong>${total}</strong> | Unworn: <strong>${unworn}</strong> |
    Most worn (${maxWorn}): ${mostWorn.join(', ')} | Least worn (${minWorn}): ${leastWorn.join(', ')}`;
}

/* ---------- add cloth with Base64 image ---------- */
$('addBtn').addEventListener('click', () => {
  const name = $('clothName').value.trim();
  const type = $('clothType').value;
  const color = $('clothColor').value;
  const comfort = $('clothComfort').value;
  const occasion = $('clothOccasion').value;
  const worn = parseInt($('clothWorn').value) || 0;
  const imageInput = $('clothImage');

  if (!name || imageInput.files.length === 0) {
    alert('Please enter name and choose an image.');
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const imgURL = e.target.result; // ✅ Base64 string
    wardrobe.push({ id: idCounter++, name, type, color, comfort, occasion, imgURL, worn });
    $('clothName').value = '';
    $('clothColor').value = '';
    $('clothWorn').value = 0;
    $('clothImage').value = '';
    renderWardrobe();
  };
  reader.readAsDataURL(imageInput.files[0]); // ✅ Convert to Base64
});

function markWorn(id) {
  const it = wardrobe.find(x => x.id === id);
  if (!it) return;
  it.worn++;
  $(`worn-${id}`).innerText = it.worn;
  updateStats();
  saveWardrobe();
}

function editWorn(id) {
  const it = wardrobe.find(x => x.id === id);
  if (!it) return;
  const v = prompt('Enter times worn (number):', it.worn);
  if (v === null) return;
  const n = parseInt(v);
  if (isNaN(n) || n < 0) { alert('Invalid number'); return; }
  it.worn = n;
  $(`worn-${id}`).innerText = it.worn;
  updateStats();
  saveWardrobe();
}

function removeCloth(id) {
  wardrobe = wardrobe.filter(x => x.id !== id);
  renderWardrobe();
  saveWardrobe();
}

/* ---------- search ---------- */
$('searchInput').addEventListener('input', () => {
  const q = $('searchInput').value.trim().toLowerCase();
  if (!q) { renderWardrobe(); $('searchResults').innerHTML = ''; return; }
  const results = wardrobe.filter(it =>
    it.name.toLowerCase().includes(q) ||
    it.type.toLowerCase().includes(q) ||
    it.occasion.toLowerCase().includes(q)
  );
  $('searchResults').innerHTML = results.map(it => `<p>${it.name} - ${it.type} (Worn: ${it.worn})</p>`).join('') || '<p>No match</p>';
  renderWardrobe(results);
});

/* ---------- suggestion logic ---------- */
$('suggestBtn').addEventListener('click', () => {
  const mood = $('moodSelect').value;
  const comfortPref = $('comfortSelect').value;
  const event = $('eventSelect').value;

  if (wardrobe.length === 0) {
    $('suggestionBox').innerText = 'No clothes available.';
    return;
  }

  let eventCandidates = wardrobe.filter(it => it.occasion === event);
  if (eventCandidates.length === 0) {
    $('suggestionBox').innerHTML = `<strong>No matching outfit found for "${humanizeOccasion(event)}".</strong>`;
    return;
  }

  let candidates = eventCandidates.filter(it => it.comfort === comfortPref);
  if (candidates.length === 0) {
    $('suggestionBox').innerHTML = `<strong>No matching outfit found for comfort preference.</strong>`;
    return;
  }

  if (candidates.length > 1 && lastSuggestedId) {
    const filtered = candidates.filter(c => c.id !== lastSuggestedId);
    if (filtered.length > 0) candidates = filtered;
  }

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  lastSuggestedId = pick.id;

  $('suggestionBox').innerHTML = `
    <div style="display:flex; gap:12px; align-items:center; justify-content:center;">
      <img src="${pick.imgURL}" style="width:90px; height:90px; object-fit:cover; border-radius:8px;">
      <div style="text-align:left;">
        <div style="font-weight:700">${pick.name} (${pick.type})</div>
        <div style="color:#555; margin-top:6px">${humanizeOccasion(pick.occasion)} • Worn: <strong id="suggest-worn-${pick.id}">${pick.worn}</strong></div>
        <div style="margin-top:8px">
          <button onclick="markWorn(${pick.id})">Mark as worn</button>
        </div>
      </div>
    </div>`;
});
