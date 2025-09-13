(function () {
  function el(id) { return document.getElementById(id); }

  // ===== Toast notifications =====
  function toast(msg, bad) {
    var t = document.createElement('div');
    t.className =
      'fixed bottom-6 right-6 px-4 py-2 rounded-2xl text-sm z-50 ' +
      (bad
        ? 'bg-red-500/90 text-white'
        : 'bg-gray-800/90 text-white') +
      ' shadow-lg transition-opacity duration-300';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.style.opacity = '0'; }, 2000);
    setTimeout(function () {
      if (t && t.parentNode) t.parentNode.removeChild(t);
    }, 2500);
  }

  // ===== Helpers =====
  function get(obj, path) {
    var parts = path.split('.'), o = obj;
    for (var i = 0; i < parts.length; i++) {
      if (!o) return undefined;
      o = o[parts[i]];
    }
    return o;
  }
  function set(obj, path, val) {
    var parts = path.split('.');
    var last = parts.pop();
    var o = obj;
    for (var i = 0; i < parts.length; i++) {
      var k = parts[i];
      if (!o[k]) o[k] = {};
      o = o[k];
    }
    o[last] = val;
    return obj;
  }
  function uploadFile(file, cb, errcb) {
    var fd = new FormData();
    fd.append('file', file, file.name || 'upload.bin');
    fetch('/api/upload', { method: 'POST', body: fd })
      .then((res) => res.json().then((j) => ({ ok: res.ok, j: j })))
      .then(function (r) {
        if (!r.ok) throw new Error(r.j && r.j.error || 'Upload failed');
        cb(r.j.path);
      })
      .catch(function (e) {
        if (errcb) errcb(e);
        else toast('Upload error: ' + e.message, true);
      });
  }

  // ===== Main form filling =====
  function fill(d) {
    el('title').value = d.title || '';
    el('slug').value = d.slug || '';
    el('color').value = d.theme_color || '#38F2AF';
    el('bg').value = d.theme_bg || '#2B2C34';
    el('locale').value = d.locale || window.BUILDER_BOOT.locale || 'pl';


    // Sections
    var secBox = el('sections'); secBox.innerHTML = '';
    var sections = (d.data && d.data.ui && d.data.ui.sections) ? d.data.ui.sections : [];
    var all = ['stack', 'skills', 'spoken', 'projects', 'experience', 'education', 'certificates', 'about'];
    all.forEach(function (k) {
      var b = document.createElement('button'); b.type = 'button';
      b.className = 'chip ' + (sections.indexOf(k) >= 0 ? '' : 'opacity-60');
      b.textContent = k;
      b.onclick = function () {
        var arr = d.data.ui.sections, i = arr.indexOf(k);
        if (i >= 0) arr.splice(i, 1); else arr.push(k);
        b.classList.toggle('opacity-60');
      };
      secBox.appendChild(b);
    });

    // Profile
    var pe = el('profileEditor'); pe.innerHTML = '';
    var p = d.data.profile || {};
    [
      ['first_name', 'First name'], ['last_name', 'Last name'], ['full_name', 'Full name'],
      ['role', 'Role'], ['location', 'Location'],
      ['phone', 'Phone (tel:...)'], ['email', 'Email (mailto:...)'],
      ['avatar_url', 'Avatar path'],
      ['contacts.github', 'GitHub URL'], ['contacts.linkedin', 'LinkedIn URL'], ['contacts.telegram', 'Telegram URL']
    ].forEach(function (pair) {
      var k = pair[0], label = pair[1];
      var dv = document.createElement('div');
      dv.innerHTML = '<label class="label">' + label + '</label><input class="input" data-k="' + k + '">';
      dv.querySelector('input').value = get(p, k) || '';
      pe.appendChild(dv);
    });

    var wrapPT = document.createElement('div');
    wrapPT.innerHTML = '<label class="label">Profile type</label>';
    var selPT = document.createElement('select'); selPT.className = 'input'; selPT.setAttribute('data-k', 'profile_type');
    [['it', 'IT / Developer'], ['artist', 'Artist'], ['researcher', 'Researcher'], ['designer', 'Designer'], ['other', 'Other']]
      .forEach(function (tp) {
        var opt = document.createElement('option'); opt.value = tp[0]; opt.textContent = tp[1]; selPT.appendChild(opt);
      });
    selPT.value = p.profile_type || 'it';
    wrapPT.appendChild(selPT); pe.appendChild(wrapPT);

    el('aboutHtml').value = d.data.about_html || '';

    // Avatar upload
    var avatarBtn = el('avatarUploadBtn'), avatarInput = el('avatarUpload');
    if (avatarBtn && avatarInput) {
      avatarBtn.onclick = function () { avatarInput.click(); };
      avatarInput.onchange = function () {
        if (!avatarInput.files || !avatarInput.files[0]) return;
        uploadFile(avatarInput.files[0], function (path) {
          d.data.profile.avatar_url = path;
          var node = pe.querySelector('input[data-k="avatar_url"]'); if (node) node.value = path;
          toast('Avatar uploaded');
        });
      };
    }

    // Draw editors
    drawProjects(d);
    drawStack(d);
    drawSkills(d);
    drawSpoken(d);
    drawExperience(d);
    drawEducation(d);
    drawCertificates(d);

    var pub = window.BUILDER_BOOT && window.BUILDER_BOOT.public || '';
    var smpub = el('sm-public'); if (smpub) smpub.textContent = pub;
  }

  // ===== Projects =====
  function drawProjects(d) {
    var pjWrap = el('projectsEditor');
    pjWrap.innerHTML = '';
    var list = d.data.projects || [];

    list.forEach(function (pr, idx) {
      var c = document.createElement('div'); c.className = 'card';
      c.innerHTML = `
        <div class="grid md:grid-cols-2 gap-3">
          <div><label class="label">Title</label><input class="input" data-f="title"></div>
          <div><label class="label">Status</label>
            <select class="input" data-f="status">
              <option value="">—</option>
              <option value="active">Active</option>
              <option value="in_progress">In progress</option>
              <option value="private">Private</option>
            </select>
          </div>
          <div class="md:col-span-2"><label class="label">Description</label><textarea class="input h-20" data-f="description"></textarea></div>
          <div><label class="label">Tags (comma)</label><input class="input" data-f="tags"></div>
          <div><label class="label">Image path</label><input class="input" data-f="image"></div>
          <div><label class="label">GitHub URL</label><input class="input" data-f="github"></div>
          <div><label class="label">Live URL</label><input class="input" data-f="live"></div>
        </div>
        <div class="mt-3 flex gap-2">
          <button class="chip" data-act="up" type="button">↑</button>
          <button class="chip" data-act="down" type="button">↓</button>
          <button class="chip" data-act="del" type="button">Delete</button>
          <input type="file" accept="image/*" data-upload="image" class="hidden">
          <button class="chip" data-act="upload" type="button">Upload image</button>
        </div>
      `;

      var nodes = c.querySelectorAll('[data-f]');
      nodes.forEach(function (inp) {
        var f = inp.getAttribute('data-f');
        if (f === 'tags') inp.value = (pr.tags || []).join(', ');
        else inp.value = pr[f] || '';
        inp.oninput = function () {
          if (f === 'tags') pr.tags = inp.value.split(',').map(s => s.trim()).filter(Boolean);
          else pr[f] = inp.value;
        };
      });

      var uploadInput = c.querySelector('[data-upload="image"]');
      c.querySelector('[data-act="upload"]').onclick = () => uploadInput.click();
      uploadInput.onchange = function () {
        if (!uploadInput.files || !uploadInput.files[0]) return;
        uploadFile(uploadInput.files[0], function (path) {
          pr.image = path;
          c.querySelector('[data-f="image"]').value = path;
          toast('Image uploaded');
        });
      };

      c.querySelector('[data-act="del"]').onclick = function () { list.splice(idx, 1); drawProjects(d); };
      c.querySelector('[data-act="up"]').onclick = function () { if (idx > 0) { [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]]; drawProjects(d); } };
      c.querySelector('[data-act="down"]').onclick = function () { if (idx < list.length - 1) { [list[idx + 1], list[idx]] = [list[idx], list[idx + 1]]; drawProjects(d); } };

      pjWrap.appendChild(c);
    });

    var add = document.createElement('button');
    add.type = 'button'; add.className = 'chip mt-2'; add.textContent = '+ Add project';
    add.onclick = function () {
      if (!d.data.projects) d.data.projects = [];
      d.data.projects.push({ title: 'New Project', description: '', tags: [], image: '', github: '', live: '', status: '' });
      drawProjects(d);
    };
    pjWrap.appendChild(add);
  }

  // ===== Stack =====
  function drawStack(d) {
    var se = el('stackEditor'); se.innerHTML = '';
    var list = d.data.stack_groups || [];

    list.forEach(function (g, idx) {
      var card = document.createElement('div'); card.className = 'card';
      card.innerHTML = `
        <div class="grid md:grid-cols-[1fr,160px,auto] gap-3 items-start">
          <div><label class="label">Group name</label><input class="input" data-k="name"></div>
          <div class="flex items-center gap-2 mt-6 md:mt-0">
            <input type="checkbox" id="vis-${idx}"><label for="vis-${idx}" class="text-sm text-white/80">Visible</label>
          </div>
          <div class="flex gap-2 justify-end">
            <button class="chip" data-act="up">↑</button>
            <button class="chip" data-act="down">↓</button>
            <button class="chip" data-act="del">Delete</button>
          </div>
        </div>
        <div class="mt-3"><label class="label">Items (comma)</label><textarea class="input h-20" data-k="items"></textarea></div>
      `;

      card.querySelector('[data-k="name"]').value = g.name || '';
      card.querySelector('[data-k="name"]').oninput = e => g.name = e.target.value;

      var visInp = card.querySelector(`#vis-${idx}`);
      visInp.checked = g.visible !== false;
      visInp.onchange = () => g.visible = visInp.checked;

      var itemsTA = card.querySelector('[data-k="items"]');
      itemsTA.value = (g.items || []).join(', ');
      itemsTA.oninput = () => g.items = itemsTA.value.split(',').map(s => s.trim()).filter(Boolean);

      card.querySelector('[data-act="del"]').onclick = () => { list.splice(idx, 1); drawStack(d); };
      card.querySelector('[data-act="up"]').onclick = () => { if (idx > 0) { [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]]; drawStack(d); } };
      card.querySelector('[data-act="down"]').onclick = () => { if (idx < list.length - 1) { [list[idx + 1], list[idx]] = [list[idx], list[idx + 1]]; drawStack(d); } };

      se.appendChild(card);
    });

    var add = document.createElement('button');
    add.type = 'button'; add.className = 'chip mt-2'; add.textContent = '+ Add group';
    add.onclick = () => { list.push({ name: 'New group', items: [], visible: true }); drawStack(d); };
    se.appendChild(add);
  }

  // ===== Skills =====
  function drawSkills(d) {
    var skWrap = el('skillsEditor');
    skWrap.innerHTML = '';
    var list = d.data.skills || [];
    list.forEach(function (s, idx) {
      var row = document.createElement('div'); row.className = 'grid md:grid-cols-[1fr,140px,160px,auto] gap-3 items-end';
      row.innerHTML = `
        <div><label class="label">Name</label><input class="input" data-k="name"></div>
        <div><label class="label">Level (0-100)</label><input class="input" data-k="level" type="number" min="0" max="100"></div>
        <div><label class="label">Label</label>
          <select class="input" data-k="label">
            <option>Primary</option><option>Advanced</option><option>Intermediate</option><option>Beginner</option>
          </select>
        </div>
        <button class="chip" data-act="del" type="button">Delete</button>`;
      var nodes = row.querySelectorAll('[data-k]');
      nodes.forEach(inp => {
        var k = inp.getAttribute('data-k');
        inp.value = s[k] != null ? s[k] : '';
        inp.oninput = () => { s[k] = (inp.type === 'number') ? Number(inp.value) : inp.value; };
      });
      row.querySelector('[data-act="del"]').onclick = () => { list.splice(idx, 1); drawSkills(d); };
      skWrap.appendChild(row);
    });
    var add = document.createElement('button'); add.type = 'button'; add.className = 'chip mt-2'; add.textContent = '+ Add skill';
    add.onclick = () => { list.push({ name: 'New', level: 50, label: 'Intermediate' }); drawSkills(d); };
    skWrap.appendChild(add);
  }

  // ===== Spoken languages =====
  function drawSpoken(d) {
    var spWrap = el('spokenEditor');
    spWrap.innerHTML = '';
    var list = d.data.spoken_languages || [];
    list.forEach(function (s, idx) {
      var row = document.createElement('div'); row.className = 'grid md:grid-cols-[1fr,140px,1fr,auto] gap-3 items-end';
      row.innerHTML = `
        <div><label class="label">Language</label><input class="input" data-k="name"></div>
        <div><label class="label">Level (0-100)</label><input class="input" data-k="level" type="number" min="0" max="100"></div>
        <div><label class="label">Label (CEFR)</label><input class="input" data-k="label" placeholder="C2, C1, B2..."></div>
        <button class="chip" data-act="del" type="button">Delete</button>`;
      var nodes = row.querySelectorAll('[data-k]');
      nodes.forEach(inp => {
        var k = inp.getAttribute('data-k');
        inp.value = s[k] != null ? s[k] : '';
        inp.oninput = () => { s[k] = (inp.type === 'number') ? Number(inp.value) : inp.value; };
      });
      row.querySelector('[data-act="del"]').onclick = () => { list.splice(idx, 1); drawSpoken(d); };
      spWrap.appendChild(row);
    });
    var add = document.createElement('button'); add.type = 'button'; add.className = 'chip mt-2'; add.textContent = '+ Add language';
    add.onclick = () => { list.push({ name: 'Language', level: 50, label: 'B1' }); drawSpoken(d); };
    spWrap.appendChild(add);
  }

  // ===== Experience =====
  function drawExperience(d) {
    var exWrap = el('experienceEditor');
    exWrap.innerHTML = '';
    var list = d.data.experience || [];
    list.forEach(function (e, idx) {
      var c = document.createElement('div'); c.className = 'card';
      c.innerHTML = `
        <div class="grid md:grid-cols-2 gap-3">
          <div><label class="label">Company</label><input class="input" data-k="company"></div>
          <div><label class="label">Role</label><input class="input" data-k="role"></div>
          <div><label class="label">Period</label><input class="input" data-k="period"></div>
          <div class="md:col-span-2"><label class="label">Bullets (one per line)</label><textarea class="input h-24" data-k="bullets"></textarea></div>
        </div>
        <div class="mt-3"><button class="chip" data-act="del" type="button">Delete</button></div>`;
      c.querySelector('[data-k="company"]').value = e.company || '';
      c.querySelector('[data-k="company"]').oninput = ev => e.company = ev.target.value;
      c.querySelector('[data-k="role"]').value = e.role || '';
      c.querySelector('[data-k="role"]').oninput = ev => e.role = ev.target.value;
      c.querySelector('[data-k="period"]').value = e.period || '';
      c.querySelector('[data-k="period"]').oninput = ev => e.period = ev.target.value;
      var bta = c.querySelector('[data-k="bullets"]');
      bta.value = (e.bullets || []).join('\n');
      bta.oninput = () => e.bullets = bta.value.split('\n').map(s => s.trim()).filter(Boolean);
      c.querySelector('[data-act="del"]').onclick = () => { list.splice(idx, 1); drawExperience(d); };
      exWrap.appendChild(c);
    });
    var add = document.createElement('button'); add.type = 'button'; add.className = 'chip mt-2'; add.textContent = '+ Add position';
    add.onclick = () => { list.push({ company: '', role: '', period: '', bullets: [] }); drawExperience(d); };
    exWrap.appendChild(add);
  }

  // ===== Education =====
  function drawEducation(d) {
    var eduWrap = el('eduEditor');
    eduWrap.innerHTML = '';
    var list = d.data.education || [];
    list.forEach(function (e, idx) {
      var c = document.createElement('div'); c.className = 'card';
      c.innerHTML = `
        <div class="grid md:grid-cols-2 gap-3">
          <div><label class="label">Institution</label><input class="input" data-k="institution"></div>
          <div><label class="label">Field of study</label><input class="input" data-k="field"></div>
          <div><label class="label">Country</label><input class="input" data-k="country"></div>
          <div><label class="label">City</label><input class="input" data-k="city"></div>
          <div><label class="label">Type</label><input class="input" data-k="type"></div>
          <div><label class="label">Level</label><input class="input" data-k="level"></div>
          <div><label class="label">Mode</label><input class="input" data-k="mode"></div>
          <div><label class="label">Start (YYYY-MM)</label><input class="input" data-k="start"></div>
          <div><label class="label">End (YYYY-MM)</label><input class="input" data-k="end"></div>
          <div class="md:col-span-2"><label class="label">Description</label><textarea class="input h-24" data-k="description"></textarea></div>
        </div>
        <div class="mt-3"><button class="chip" data-act="del" type="button">Delete</button></div>`;
      var nodes = c.querySelectorAll('[data-k]');
      nodes.forEach(inp => {
        var k = inp.getAttribute('data-k');
        inp.value = e[k] || '';
        inp.oninput = () => e[k] = inp.value;
      });
      c.querySelector('[data-act="del"]').onclick = () => { list.splice(idx, 1); drawEducation(d); };
      eduWrap.appendChild(c);
    });
    var add = document.createElement('button'); add.type = 'button'; add.className = 'chip mt-2'; add.textContent = '+ Add education';
    add.onclick = () => { list.push({ institution: '', field: '', country: '', city: '', type: 'university', level: 'bachelor', mode: 'full_time', start: '', end: '', description: '' }); drawEducation(d); };
    eduWrap.appendChild(add);
  }

  // ===== Certificates =====
  function drawCertificates(d) {
    var certWrap = el('certEditor');
    certWrap.innerHTML = '';
    var list = d.data.certificates || [];
    list.forEach(function (cer, idx) {
      var c = document.createElement('div'); c.className = 'card';
      c.innerHTML = `
        <div class="grid md:grid-cols-2 gap-3">
          <div><label class="label">Name</label><input class="input" data-k="name"></div>
          <div><label class="label">Issuer</label><input class="input" data-k="issuer"></div>
          <div><label class="label">Date</label><input class="input" data-k="date" type="month"></div>
          <div><label class="label">Credential ID</label><input class="input" data-k="credential_id"></div>
          <div class="md:col-span-2"><label class="label">Credential URL</label><input class="input" data-k="credential_url"></div>
        </div>
        <div class="mt-3"><button class="chip" data-act="del" type="button">Delete</button></div>`;
      var nodes = c.querySelectorAll('[data-k]');
      nodes.forEach(inp => {
        var k = inp.getAttribute('data-k');
        inp.value = cer[k] || '';
        inp.oninput = () => cer[k] = inp.value;
      });
      c.querySelector('[data-act="del"]').onclick = () => { list.splice(idx, 1); drawCertificates(d); };
      certWrap.appendChild(c);
    });
    var add = document.createElement('button'); add.type = 'button'; add.className = 'chip mt-2'; add.textContent = '+ Add certificate';
    add.onclick = () => { list.push({ name: '', issuer: '', date: '', credential_id: '', credential_url: '' }); drawCertificates(d); };
    certWrap.appendChild(add);
  }

  // ===== Save =====
  function save() {
    var d = window.__P;
    var nodes = document.querySelectorAll('#profileEditor [data-k]');
    nodes.forEach(inp => {
      var k = inp.getAttribute('data-k');
      set(d.data.profile, k, inp.value);
    });
    d.title = el('title').value;
    d.slug = el('slug').value;
    d.theme_color = el('color').value;
    d.theme_bg = el('bg').value;
    d.locale = el('locale').value;   // <- вот оно!
    d.data.about_html = el('aboutHtml').value;

    fetch(window.BUILDER_BOOT.api, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: d.title,
        slug: d.slug,
        theme_color: d.theme_color,
        theme_bg: d.theme_bg,
        locale: d.locale,      // <- отправляем!
        data: d.data
      })
    })
    .then((res) => res.json().then((j) => ({ ok: res.ok, j: j })))
    .then(function (r) {
      if (!r.ok) throw new Error(r.j && r.j.error ? r.j.error : 'Save failed');
      toast('Saved successfully');
    })
    .catch(function (err) {
      console.error('Save error', err);
      toast('Save error: ' + err.message, true);
    });
  }

  // ===== Delete =====
  function deletePortfolio() {
    if (!confirm('Delete this portfolio? This cannot be undone.')) return;
    fetch(window.BUILDER_BOOT.api, { method: 'DELETE' })
      .then((res) => res.json().then((j) => ({ ok: res.ok, j: j })))
      .then((r) => {
        if (!r.ok) throw new Error(r.j && r.j.error || 'Delete failed');
        location.href = '/dashboard';
      })
      .catch((e) => toast('Delete error: ' + e.message, true));
  }

  // ===== Load =====
  function load() {
    var boot = window.BUILDER_BOOT || {};
    fetch(boot.api)
      .then((res) => res.json().then((j) => ({ ok: res.ok, j: j })))
      .then((r) => {
        if (!r.ok) throw new Error(r.j && r.j.error || 'Load failed');
        window.__P = r.j;
        fill(r.j);
      })
      .catch((err) => { console.error('Load error', err); toast('Load error', true); });
  }

  // ===== Init =====
  function init() {
    var btn = el('saveBtn'); if (btn) btn.addEventListener('click', save);
    var del = el('deletePortfolio'); if (del) del.addEventListener('click', deletePortfolio);
    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
