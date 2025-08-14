(function () {
  function el(id){ return document.getElementById(id); }
  function toast(msg, bad){
    var t = document.createElement('div');
    t.className = 'fixed bottom-6 right-6 px-4 py-2 rounded-2xl ' + (bad ? 'bg-red-500/30' : 'bg-white/10') + ' shadow-soft';
    t.textContent = msg; document.body.appendChild(t);
    setTimeout(function(){ if (t && t.parentNode) t.parentNode.removeChild(t); }, 1800);
  }
  function get(obj, path){ var parts = path.split('.'), o = obj; for (var i=0;i<parts.length;i++){ if (!o) return undefined; o = o[parts[i]]; } return o; }
  function set(obj, path, val){ var parts = path.split('.'); var last = parts.pop(); var o = obj; for (var i=0;i<parts.length;i++){ var k=parts[i]; if (!o[k]) o[k]={}; o=o[k]; } o[last]=val; return obj; }

  function uploadFile(file, cb, errcb){
    var fd = new FormData(); fd.append('file', file, file.name || 'upload.bin');
    fetch('/api/upload', { method:'POST', body: fd })
      .then(function(res){ return res.json().then(function(j){ return {ok:res.ok, j:j}; }); })
      .then(function(r){ if(!r.ok) throw new Error(r.j && r.j.error || 'upload failed'); cb(r.j.path); })
      .catch(function(e){ if(errcb) errcb(e); else toast('Upload error: '+e.message, true); });
  }

  function fill(d){
    el('title').value = d.title || '';
    el('slug').value = d.slug || '';
    el('color').value = d.theme_color || '#38F2AF';
    el('bg').value = d.theme_bg || '#2B2C34';
    el('locale').value = d.locale || 'pl';

    var secBox = el('sections'); secBox.innerHTML = '';
    var sections = (d.data && d.data.ui && d.data.ui.sections) ? d.data.ui.sections : [];
    var all = ['stack','skills','spoken','projects','experience','education','certificates','about'];
    all.forEach(function(k){
      var b = document.createElement('button'); b.type='button';
      b.className = 'chip ' + (sections.indexOf(k)>=0 ? '' : 'opacity-60');
      b.textContent = k;
      b.onclick = function(){
        var arr = d.data.ui.sections, i = arr.indexOf(k);
        if (i>=0) arr.splice(i,1); else arr.push(k);
        if (b.className.indexOf('opacity-60')>=0) b.className = b.className.replace(' opacity-60','');
        else b.className += ' opacity-60';
      };
      secBox.appendChild(b);
    });

    var pe = el('profileEditor'); pe.innerHTML = '';
    var p = d.data.profile || {};
    [
      ['first_name','First name'],['last_name','Last name'],['full_name','Full name'],
      ['role','Role'],['location','Location'],
      ['phone','Phone (tel:...)'],['email','Email (mailto:...)'],
      ['avatar_url','Avatar (static path)'],
      ['contacts.github','GitHub URL'],['contacts.linkedin','LinkedIn URL'],['contacts.telegram','Telegram URL']
    ].forEach(function(pair){
      var k = pair[0], label = pair[1];
      var dv = document.createElement('div');
      dv.innerHTML = '<label class="label">'+label+'</label><input class="input" data-k="'+k+'">';
      dv.querySelector('input').value = get(p,k) || '';
      pe.appendChild(dv);
    });
    var wrapPT = document.createElement('div');
    wrapPT.innerHTML = '<label class="label">Profile type</label>';
    var selPT = document.createElement('select'); selPT.className='input'; selPT.setAttribute('data-k','profile_type');
    [['it','IT / Developer'],['artist','Artist'],['researcher','Researcher'],['designer','Designer'],['other','Other']].forEach(function(tp){
      var opt=document.createElement('option'); opt.value=tp[0]; opt.textContent=tp[1]; selPT.appendChild(opt);
    });
    selPT.value = p.profile_type || 'it';
    wrapPT.appendChild(selPT); pe.appendChild(wrapPT);

    el('aboutHtml').value = d.data.about_html || '';

    var avatarBtn = el('avatarUploadBtn'), avatarInput = el('avatarUpload');
    if (avatarBtn && avatarInput) {
      avatarBtn.onclick = function(){ avatarInput.click(); };
      avatarInput.onchange = function(){
        if (!avatarInput.files || !avatarInput.files[0]) return;
        if (typeof window.__ensureCropper === 'function') {
          window.__ensureCropper().then(function(){
            openCropper(avatarInput.files[0], function(blob){
              var file = new File([blob], 'avatar.png', {type:'image/png'});
              uploadFile(file, function(path){
                d.data.profile.avatar_url = path;
                var node = pe.querySelector('input[data-k="avatar_url"]'); if (node) node.value = path;
                toast('Аватар загружен');
              });
            });
          });
        } else {
          uploadFile(avatarInput.files[0], function(path){
            d.data.profile.avatar_url = path;
            var node = pe.querySelector('input[data-k="avatar_url"]'); if (node) node.value = path;
            toast('Аватар загружен');
          });
        }
      };
    }

    var pjWrap = el('projectsEditor');
    function drawProjects(){
      pjWrap.innerHTML = '';
      var list = d.data.projects || [];
      list.forEach(function(pr, idx){
        var c = document.createElement('div'); c.className = 'card';
        c.innerHTML = ''
         + '<div class="grid md:grid-cols-2 gap-3">'
         + '  <div><label class="label">Title</label><input class="input" data-f="title"></div>'
         + '  <div><label class="label">Status</label>'
         + '    <select class="input" data-f="status"><option value="">—</option><option value="active">active</option><option value="in_progress">in_progress</option><option value="private">private</option></select>'
         + '  </div>'
         + '  <div class="md:col-span-2"><label class="label">Description</label><textarea class="input h-20" data-f="description"></textarea></div>'
         + '  <div><label class="label">Tags (comma)</label><input class="input" data-f="tags"></div>'
         + '  <div><label class="label">Image (static path)</label><input class="input" data-f="image"></div>'
         + '  <div><label class="label">GitHub URL</label><input class="input" data-f="github"></div>'
         + '  <div><label class="label">Live URL</label><input class="input" data-f="live"></div>'
         + '</div>'
         + '<div class="mt-3 flex gap-2">'
         + '  <button class="chip" data-act="up" type="button">↑</button>'
         + '  <button class="chip" data-act="down" type="button">↓</button>'
         + '  <button class="chip" data-act="del" type="button">Удалить</button>'
         + '  <input type="file" accept="image/*" data-upload="image" class="hidden">'
         + '  <button class="chip" data-act="upload" type="button">Upload image</button>'
         + '</div>';

        var nodes = c.querySelectorAll('[data-f]');
        for (var i=0;i<nodes.length;i++){
          var inp = nodes[i], f = inp.getAttribute('data-f');
          if (f==='tags') inp.value = (pr.tags||[]).join(', ');
          else inp.value = pr[f] || '';
          inp.oninput = (function(inp,f){ return function(){
            if (f==='tags') pr.tags = inp.value.split(',').map(function(s){return s.trim();}).filter(Boolean);
            else pr[f] = inp.value;
          }; })(inp,f);
        }
        var uploadInput = c.querySelector('[data-upload="image"]');
        var acts = c.querySelectorAll('[data-act]');
        for (var j=0;j<acts.length;j++){
          var btn = acts[j], act = btn.getAttribute('data-act');
          if (act==='upload'){ btn.onclick = function(){ uploadInput.click(); }; }
          else {
            btn.onclick = (function(act){
              return function(){
                if (act==='del'){ list.splice(idx,1); drawProjects(); }
                if (act==='up' && idx>0){ var t=list[idx-1]; list[idx-1]=pr; list[idx]=t; drawProjects(); }
                if (act==='down' && idx<list.length-1){ var t2=list[idx+1]; list[idx+1]=pr; list[idx]=t2; drawProjects(); }
              };
            })(act);
          }
        }
        uploadInput.onchange = function(){
          if (!uploadInput.files || !uploadInput.files[0]) return;
          uploadFile(uploadInput.files[0], function(path){
            pr.image = path;
            var imgInp = c.querySelector('[data-f="image"]'); if (imgInp) imgInp.value = path;
            toast('Картинка загружена');
          });
        };
        pjWrap.appendChild(c);
      });
      var add = document.createElement('button');
      add.type='button'; add.className='chip mt-2'; add.textContent='+ dodaj projekt';
      add.onclick = function(){
        if (!d.data.projects) d.data.projects = [];
        d.data.projects.push({title:'New Project',description:'',tags:[],image:'',github:'',live:'',status:''});
        drawProjects();
      };
      pjWrap.appendChild(add);
    }
    drawProjects();

    var se = el('stackEditor'); se.innerHTML='';
    var sg = d.data.stack_groups;
    if (sg && !Array.isArray(sg)) {
      var arr = []; for (var k in sg) { if (sg.hasOwnProperty(k)) arr.push({ name: k, items: (sg[k]||[]), visible: true }); }
      d.data.stack_groups = sg = arr;
    }
    if (!Array.isArray(sg)) { d.data.stack_groups = sg = []; }
    function drawStack(){
      se.innerHTML = '';
      var list = d.data.stack_groups;
      for (var i=0;i<list.length;i++){
        (function(idx){
          var g = list[idx];
          var card = document.createElement('div'); card.className='card';
          card.innerHTML = ''
            + '<div class="grid md:grid-cols-[1fr,160px,auto] gap-3 items-start">'
            + '  <div><label class="label">Group name</label><input class="input" data-k="name" placeholder="Languages / Frameworks ..."></div>'
            + '  <div class="flex items-center gap-2 mt-6 md:mt-0">'
            + '    <input type="checkbox" id="vis-'+idx+'"><label for="vis-'+idx+'" class="text-sm text-white/80">Visible</label>'
            + '  </div>'
            + '  <div class="flex gap-2 justify-end">'
            + '    <button class="chip" data-act="up">↑</button>'
            + '    <button class="chip" data-act="down">↓</button>'
            + '    <button class="chip" data-act="del">Удалить</button>'
            + '  </div>'
            + '</div>'
            + '<div class="mt-3"><label class="label">Items (comma separated)</label><textarea class="input h-20" data-k="items"></textarea></div>';

          var nameInp = card.querySelector('[data-k="name"]');
          nameInp.value = g.name || ''; nameInp.oninput = function(){ g.name = nameInp.value; };

          var visInp = card.querySelector('#vis-'+idx);
          visInp.checked = (g.visible !== false); visInp.onchange = function(){ g.visible = visInp.checked; };

          var itemsTA = card.querySelector('[data-k="items"]');
          itemsTA.value = (g.items || []).join(', ');
          itemsTA.oninput = function(){ g.items = itemsTA.value.split(',').map(function(s){ return s.trim(); }).filter(Boolean); };

          var acts = card.querySelectorAll('[data-act]');
          for (var j=0;j<acts.length;j++){
            var btn = acts[j]; (function(act){
              btn.onclick = function(){
                if (act==='del'){ list.splice(idx,1); drawStack(); }
                if (act==='up' && idx>0){ var t=list[idx-1]; list[idx-1]=list[idx]; list[idx]=t; drawStack(); }
                if (act==='down' && idx<list.length-1){ var t2=list[idx+1]; list[idx+1]=list[idx]; list[idx]=t2; drawStack(); }
              };
            })(btn.getAttribute('data-act'));
          }
          se.appendChild(card);
        })(i);
      }
      var add = document.createElement('button');
      add.type='button'; add.className='chip mt-2'; add.innerHTML='+ add group';
      add.onclick = function(){ list.push({name:'New group', items:[], visible:true}); drawStack(); };
      se.appendChild(add);
    }
    drawStack();

    var skWrap = el('skillsEditor');
    function drawSkills(){
      skWrap.innerHTML=''; var list = d.data.skills || [];
      list.forEach(function(s, idx){
        var row = document.createElement('div'); row.className='grid md:grid-cols-[1fr,140px,160px,auto] gap-3 items-end';
        row.innerHTML = ''
          + '<div><label class="label">Name</label><input class="input" data-k="name"></div>'
          + '<div><label class="label">Level (0-100)</label><input class="input" data-k="level" type="number" min="0" max="100"></div>'
          + '<div><label class="label">Label</label><select class="input" data-k="label"><option>Primary</option><option>Advanced</option><option>Intermediate</option><option>Beginner</option></select></div>'
          + '<button class="chip" data-act="del" type="button">Удалить</button>';
        var nodes = row.querySelectorAll('[data-k]');
        for (var i=0;i<nodes.length;i++){
          var inp = nodes[i], k = inp.getAttribute('data-k');
          inp.value = (s[k]!=null ? s[k] : '');
          inp.oninput = (function(inp,k){ return function(){ s[k] = (inp.type==='number') ? Number(inp.value) : inp.value; }; })(inp,k);
        }
        row.querySelector('[data-act="del"]').onclick = function(){ list.splice(idx,1); drawSkills(); };
        skWrap.appendChild(row);
      });
      var add = document.createElement('button'); add.type='button'; add.className='chip mt-2'; add.textContent='+ skill';
      add.onclick = function(){ if (!d.data.skills) d.data.skills = []; d.data.skills.push({name:'New',level:50,label:'Intermediate'}); drawSkills(); };
      skWrap.appendChild(add);
    }
    drawSkills();

    var spWrap = el('spokenEditor');
    function drawSpoken(){
      spWrap.innerHTML=''; var list = d.data.spoken_languages || [];
      list.forEach(function(s, idx){
        var row = document.createElement('div'); row.className='grid md:grid-cols-[1fr,140px,1fr,auto] gap-3 items-end';
        row.innerHTML = ''
          + '<div><label class="label">Language</label><input class="input" data-k="name"></div>'
          + '<div><label class="label">Level (0-100)</label><input class="input" data-k="level" type="number" min="0" max="100"></div>'
          + '<div><label class="label">Label (CEFR)</label><input class="input" data-k="label" placeholder="C2, C1, B2..."></div>'
          + '<button class="chip" data-act="del" type="button">Удалить</button>';
        var nodes = row.querySelectorAll('[data-k]');
        for (var i=0;i<nodes.length;i++){
          var inp = nodes[i], k = inp.getAttribute('data-k');
          inp.value = (s[k]!=null ? s[k] : '');
          inp.oninput = (function(inp,k){ return function(){ s[k] = (inp.type==='number') ? Number(inp.value) : inp.value; }; })(inp,k);
        }
        row.querySelector('[data-act="del"]').onclick = function(){ list.splice(idx,1); drawSpoken(); };
        spWrap.appendChild(row);
      });
      var add = document.createElement('button'); add.type='button'; add.className='chip mt-2'; add.textContent='+ language';
      add.onclick = function(){ if (!d.data.spoken_languages) d.data.spoken_languages = []; d.data.spoken_languages.push({name:'Language',level:50,label:'B1'}); drawSpoken(); };
      spWrap.appendChild(add);
    }
    drawSpoken();

    var exWrap = el('experienceEditor');
    function drawExp(){
      exWrap.innerHTML=''; var list = d.data.experience || [];
      list.forEach(function(e, idx){
        var c = document.createElement('div'); c.className='card';
        c.innerHTML = ''
          + '<div class="grid md:grid-cols-2 gap-3">'
          + '  <div><label class="label">Company</label><input class="input" data-k="company"></div>'
          + '  <div><label class="label">Role</label><input class="input" data-k="role"></div>'
          + '  <div><label class="label">Period</label><input class="input" data-k="period"></div>'
          + '  <div class="md:col-span-2"><label class="label">Bullets (one per line)</label><textarea class="input h-24" data-k="bullets"></textarea></div>'
          + '</div>'
          + '<div class="mt-3"><button class="chip" data-act="del" type="button">Удалить</button></div>';
        var bta = c.querySelector('[data-k="bullets"]');
        bta.value = (e.bullets||[]).join('\n');
        bta.oninput = function(){ e.bullets = bta.value.split('\n').map(function(s){return s.trim();}).filter(Boolean); };
        var nodes = c.querySelectorAll('[data-k]');
        for (var i=0;i<nodes.length;i++){
          var inp = nodes[i], k = inp.getAttribute('data-k');
          if (k!=='bullets'){ inp.value = e[k] || ''; inp.oninput = (function(inp,k){ return function(){ e[k]=inp.value; }; })(inp,k); }
        }
        c.querySelector('[data-act="del"]').onclick = function(){ list.splice(idx,1); drawExp(); };
        exWrap.appendChild(c);
      });
      var add = document.createElement('button'); add.type='button'; add.className='chip mt-2'; add.textContent='+ pozycja';
      add.onclick = function(){ if (!d.data.experience) d.data.experience = []; d.data.experience.push({company:'',role:'',period:'',bullets:[]}); drawExp(); };
      exWrap.appendChild(add);
    }
    drawExp();

    var eduWrap = el('eduEditor');
    if (d.data.education && d.data.education.length && typeof d.data.education[0] === 'string') {
      d.data.education = d.data.education.map(function(s){ return { institution: s, country:'', city:'', type:'school', level:'secondary', field:'', mode:'full_time', start:'', end:'', description:'' }; });
    }
    function drawEdu(){
      eduWrap.innerHTML='';
      var list = d.data.education || [];
      list.forEach(function(e, idx){
        var c = document.createElement('div'); c.className='card';
        c.innerHTML = ''
          + '<div class="grid md:grid-cols-2 gap-3">'
          + '  <div><label class="label">Institution</label><input class="input" data-k="institution"></div>'
          + '  <div><label class="label">Field of study</label><input class="input" data-k="field" placeholder="Computer Science"></div>'
          + '  <div><label class="label">Country</label><input class="input" data-k="country"></div>'
          + '  <div><label class="label">City</label><input class="input" data-k="city"></div>'
          + '  <div><label class="label">Type</label><select class="input" data-k="type"><option value="school">School</option><option value="lyceum">Lyceum</option><option value="college">College</option><option value="university">University</option><option value="bootcamp">Bootcamp</option><option value="course">Course</option></select></div>'
          + '  <div><label class="label">Level</label><select class="input" data-k="level"><option value="secondary">Secondary</option><option value="upper_secondary">Upper secondary</option><option value="bachelor">Bachelor</option><option value="engineer">Engineer</option><option value="master">Master</option><option value="phd">PhD</option><option value="course">Course</option><option value="certificate">Certificate</option></select></div>'
          + '  <div><label class="label">Mode</label><select class="input" data-k="mode"><option value="full_time">Full-time</option><option value="part_time">Part-time</option><option value="remote">Remote</option></select></div>'
          + '  <div><label class="label">Start (YYYY-MM)</label><input class="input" data-k="start" type="month"></div>'
          + '  <div><label class="label">End (YYYY-MM, empty = now)</label><input class="input" data-k="end" type="month"></div>'
          + '  <div class="md:col-span-2"><label class="label">Description</label><textarea class="input h-24" data-k="description" placeholder="Achievements, thesis, GPA…"></textarea></div>'
          + '</div>'
          + '<div class="mt-3"><button class="chip" data-act="del" type="button">Удалить</button></div>';

        var nodes = c.querySelectorAll('[data-k]');
        for (var i=0;i<nodes.length;i++){
          var inp = nodes[i], k = inp.getAttribute('data-k');
          inp.value = e[k] || '';
          inp.oninput = (function(inp,k){ return function(){ e[k] = inp.value; }; })(inp,k);
        }
        c.querySelector('[data-act="del"]').onclick = function(){ list.splice(idx,1); drawEdu(); };
        eduWrap.appendChild(c);
      });
      var add = document.createElement('button'); add.type='button'; add.className='chip mt-2'; add.textContent='+ education';
      add.onclick = function(){
        if (!d.data.education) d.data.education = [];
        d.data.education.push({institution:'', country:'', city:'', type:'university', level:'bachelor', field:'', mode:'full_time', start:'', end:'', description:''});
        drawEdu();
      };
      eduWrap.appendChild(add);
    }
    drawEdu();

    var certWrap = el('certEditor');
    function drawCert(){
      certWrap.innerHTML=''; var list = d.data.certificates || [];
      list.forEach(function(cer, idx){
        var c = document.createElement('div'); c.className='card';
        c.innerHTML = ''
         + '<div class="grid md:grid-cols-2 gap-3">'
         + '  <div><label class="label">Name</label><input class="input" data-k="name"></div>'
         + '  <div><label class="label">Issuer</label><input class="input" data-k="issuer"></div>'
         + '  <div><label class="label">Date (YYYY-MM)</label><input class="input" data-k="date" type="month"></div>'
         + '  <div><label class="label">Credential ID</label><input class="input" data-k="credential_id"></div>'
         + '  <div class="md:col-span-2"><label class="label">Credential URL</label><input class="input" data-k="credential_url" placeholder="https://..."></div>'
         + '</div>'
         + '<div class="mt-3"><button class="chip" data-act="del" type="button">Удалить</button></div>';
        var nodes = c.querySelectorAll('[data-k]');
        for (var i=0;i<nodes.length;i++){
          var inp = nodes[i], k = inp.getAttribute('data-k');
          inp.value = cer[k] || ''; inp.oninput = (function(inp,k){ return function(){ cer[k] = inp.value; }; })(inp,k);
        }
        c.querySelector('[data-act="del"]').onclick = function(){ list.splice(idx,1); drawCert(); };
        certWrap.appendChild(c);
      });
      var add = document.createElement('button'); add.type='button'; add.className='chip mt-2'; add.textContent='+ certificate';
      add.onclick = function(){ if (!d.data.certificates) d.data.certificates = []; d.data.certificates.push({name:'',issuer:'',date:'',credential_id:'',credential_url:''}); drawCert(); };
      certWrap.appendChild(add);
    }
    drawCert();

    var pub = window.BUILDER_BOOT && window.BUILDER_BOOT.public || '';
    var smpub = el('sm-public'); if (smpub) smpub.textContent = pub;
  }

  function save(){
    var d = window.__P;
    var nodes = document.querySelectorAll('#profileEditor [data-k]');
    for (var i=0;i<nodes.length;i++){
      var k = nodes[i].getAttribute('data-k');
      set(d.data.profile, k, nodes[i].value);
    }
    d.title = el('title').value;
    d.slug = el('slug').value;
    d.theme_color = el('color').value;
    d.theme_bg = el('bg').value;
    d.locale = el('locale').value;
    d.data.about_html = el('aboutHtml').value;

    fetch(window.BUILDER_BOOT.api, {
      method: 'PATCH',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        title: d.title, slug: d.slug, theme_color: d.theme_color,
        theme_bg: d.theme_bg, locale: d.locale, data: d.data
      })
    })
    .then(function(res){ return res.json().then(function(j){ return {ok: res.ok, j: j}; }); })
    .then(function(r){
      if (!r.ok) throw new Error(r.j && r.j.error ? r.j.error : 'Save failed');
      toast('Сохранено');
    })
    .catch(function(err){
      console.error('Save error', err);
      toast('Ошибка сохранения: ' + err.message, true);
    });
  }

  function openSettings(){
    var d = window.__P;
    el('sm-title').value = d.title || '';
    el('sm-slug').value  = d.slug || '';
    el('sm-color').value = d.theme_color || '#38F2AF';
    el('sm-bg').value    = d.theme_bg || '#2B2C34';
    el('sm-domain').value = (d.data && d.data.domain) || '';
    el('settingsModal').classList.remove('hidden');
  }
  function closeSettings(){ el('settingsModal').classList.add('hidden'); }
  function saveSettings(){
    var d = window.__P;
    d.title       = el('sm-title').value;
    d.slug        = el('sm-slug').value;
    d.theme_color = el('sm-color').value;
    d.theme_bg    = el('sm-bg').value;
    if (!d.data) d.data = {};
    d.data.domain = el('sm-domain').value;
    el('title').value = d.title; el('slug').value = d.slug;
    el('color').value = d.theme_color; el('bg').value = d.theme_bg;
    closeSettings(); save();
  }
  function deletePortfolio(){
    if (!confirm('Удалить это портфолио? Действие необратимо.')) return;
    fetch(window.BUILDER_BOOT.api, { method:'DELETE' })
      .then(function(res){ return res.json().then(function(j){ return {ok:res.ok, j:j}; }); })
      .then(function(r){ if(!r.ok) throw new Error(r.j && r.j.error || 'Delete failed'); location.href='/dashboard'; })
      .catch(function(e){ toast('Ошибка удаления: ' + e.message, true); });
  }

  function load(){
    var boot = window.BUILDER_BOOT || {};
    fetch(boot.api)
      .then(function(res){ return res.json().then(function(j){ return {ok:res.ok, j:j}; }); })
      .then(function(r){
        if (!r.ok) throw new Error(r.j && r.j.error || 'Load failed');
        window.__P = r.j; fill(r.j);
      })
      .catch(function(err){ console.error('Load error', err); toast('Ошибка загрузки данных', true); });
  }

  function openCropper(file, done){
    var modal = el('cropModal'), img = el('cropImage');
    var cropper = null;
    var reader = new FileReader();
    reader.onload = function(){ img.src = reader.result; modal.classList.remove('hidden');
      cropper = new window.Cropper(img, {aspectRatio:1, viewMode:1, dragMode:'move', background:false, autoCropArea:1});
    };
    reader.readAsDataURL(file);

    function close(){
      modal.classList.add('hidden');
      if (cropper) { cropper.destroy(); cropper=null; }
    }
    function apply(){
      if (!cropper) return;
      var canvas = cropper.getCroppedCanvas({width:512, height:512, imageSmoothingQuality:'high'});
      canvas.toBlob(function(blob){ close(); done(blob); }, 'image/png', 0.96);
    }

    el('cropApply').onclick = apply;
    el('cropCancel').onclick = close;
    var closers = document.querySelectorAll('[data-close="crop"]');
    for (var i=0;i<closers.length;i++){ closers[i].onclick = close; }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  function init(){
    var btn = el('saveBtn'); if (btn) btn.addEventListener('click', save);
    var os = el('openSettings'); if (os) os.addEventListener('click', openSettings);
    var s1 = el('smSave'); if (s1) s1.addEventListener('click', saveSettings);
    var sc = el('smCancel'); if (sc) sc.addEventListener('click', function(){el('settingsModal').classList.add('hidden');});
    var del = el('deletePortfolio'); if (del) del.addEventListener('click', deletePortfolio);
    var closers = document.querySelectorAll('[data-close="1"]'); for (var i=0;i<closers.length;i++){ closers[i].addEventListener('click', function(){el('settingsModal').classList.add('hidden');}); }
    load();
  }
})();
