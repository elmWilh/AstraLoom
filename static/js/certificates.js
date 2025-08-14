(() => {
  const boot = window.BUILDER_BOOT || {};
  if (!boot.api || !boot.pid) return;

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const list = $('#certList');
  const tpl = $('#certRowTpl');
  const addBtn = $('#addCertBtn');
  const saveBtn = $('#saveCertsBtn');

  let current = null;

  async function fetchData() {
    const res = await fetch(boot.api, { credentials: 'same-origin' });
    if (!res.ok) throw new Error('Fetch portfolio failed');
    const json = await res.json();
    current = json;
    if (!current.data) current.data = {};
    if (!Array.isArray(current.data.certificates)) current.data.certificates = [];
    render();
  }

  function row(cert = {}) {
    const node = tpl.content.firstElementChild.cloneNode(true);
    const [name, issuer] = $$('.input', node);
    const [date, credId, credUrl] = $$('.input', node).slice(2);

    name.value = cert.name || '';
    issuer.value = cert.issuer || '';
    date.value = cert.date || '';
    credId.value = cert.credential_id || '';
    credUrl.value = cert.credential_url || '';

    $('.remove', node).addEventListener('click', () => {
      node.remove();
    });
    return node;
  }

  function render() {
    list.innerHTML = '';
    current.data.certificates.forEach(c => list.appendChild(row(c)));
  }

  function collect() {
    return $$('.rounded-2xl', list).map(node => {
      const inputs = $$('.input', node);
      return {
        name: inputs[0].value.trim(),
        issuer: inputs[1].value.trim(),
        date: inputs[2].value.trim(),
        credential_id: inputs[3].value.trim(),
        credential_url: inputs[4].value.trim()
      };
    }).filter(c => c.name);
  }

  async function save() {
    const payload = {
      data: {
        ...(current.data || {}),
        certificates: collect()
      }
    };
    const res = await fetch(boot.api, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert('Save failed: ' + (j.detail || res.status));
      return;
    }
    current.data.certificates = payload.data.certificates;
    alert('Certificates saved');
  }

  addBtn && addBtn.addEventListener('click', () => list.appendChild(row()));
  saveBtn && saveBtn.addEventListener('click', save);

  fetchData().catch(err => console.error(err));
})();
