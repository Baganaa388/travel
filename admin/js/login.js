/* Admin нэвтрэлт */
const form = document.getElementById('loginForm');
const alertBox = document.getElementById('loginAlert');
const btn = document.getElementById('loginBtn');

function alertMsg(text, kind = 'err') {
  alertBox.replaceChildren();
  if (!text) return;
  const d = document.createElement('div');
  d.className = `alert alert-${kind}`;
  d.textContent = text;
  alertBox.append(d);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  alertMsg('');
  btn.disabled = true;
  btn.textContent = 'Шалгаж байна…';
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        username: document.getElementById('u').value.trim(),
        password: document.getElementById('p').value,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Нэвтэрч чадсангүй');
    location.href = '/admin/dashboard';
  } catch (err) {
    alertMsg(err.message);
    btn.disabled = false;
    btn.textContent = 'Нэвтрэх';
    document.getElementById('p').value = '';
    document.getElementById('p').focus();
  }
});

/* Аль хэдийн нэвтэрсэн бол шууд самбар руу */
fetch('/api/admin/me', { credentials: 'same-origin' })
  .then((r) => (r.ok ? (location.href = '/admin/dashboard') : null))
  .catch(() => {});
