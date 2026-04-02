// ============================================================
// RENDER — CATALOG
// ============================================================
// ============================================================
// GEOLOCATION FUNCTIONS
// ============================================================
function detectGeo() {
  const input = document.getElementById('ep-district');
  if (!input) return;
  input.placeholder = '⏳ Определение геолокации...';
  input.disabled = true;
  
  if (!navigator.geolocation) {
    input.placeholder = 'Выберите или введите район';
    input.disabled = false;
    alert('❌ Браузер не поддерживает геолокацию');
    return;
  }
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      reverseGeocode(lat, lng, input);
    },
    (error) => {
      input.placeholder = 'Выберите или введите район';
      input.disabled = false;
      let msg = '❌ Не удалось определить геолокацию';
      if (error.code === 1) msg = '❌ Разрешение отклонено';
      if (error.code === 2) msg = '❌ Позиция недоступна';
      if (error.code === 3) msg = '❌ Время ожидания истекло';
      alert(msg);
    }
  );
}

function reverseGeocode(lat, lng, input) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
  
  fetch(url)
    .then(response => response.json())
    .then(data => {
      let geoName = '';
      if (data.address) {
        geoName = data.address.neighbourhood || 
                  data.address.suburb || 
                  data.address.city_district || 
                  data.address.district || 
                  data.address.city || 
                  data.address.town || '';
      }
      if (!geoName) {
        geoName = data.name || 'Неизвестное место';
      }
      input.value = geoName;
      input.placeholder = 'Выберите или введите район';
      input.disabled = false;
    })
    .catch(error => {
      console.error('Ошибка Nominatim:', error);
      input.placeholder = 'Выберите или введите район';
      input.disabled = false;
      alert('Ошибка при определении района');
    });
}

// ============================================================
function renderCatalog() {
  const search = (document.getElementById('catalog-search')?.value || '').toLowerCase();
  const list = document.getElementById('catalog-list');
  if (!list) return;
  const filtered = SPECIALISTS.filter(s => {
    const matchFilter = catalogFilter === 'Все' || s.tags.includes(catalogFilter);
    const matchSearch = !search || s.name.toLowerCase().includes(search) || s.tags.join(' ').toLowerCase().includes(search);
    return matchFilter && matchSearch;
  });
  list.innerHTML = filtered.map(s => `
    <div class="scard" onclick="openSpecialist(${s.id})">
      <div class="avatar" style="width:56px;height:56px;font-size:22px;background:${s.grad};">${s.initials}</div>
      <div style="flex:1;">
        <div class="scard-name">${s.name}</div>
        <div class="scard-meta"><span class="tag ${s.badgeType}">${s.badge}</span><span class="stars">${s.rating}</span><span style="font-size:12px;color:var(--text-secondary);">(${s.reviews})</span></div>
        <div style="font-size:13px;color:var(--text-secondary);">${s.location} • ${s.tags.slice(0,2).join(', ')}</div>
        <div style="display:flex;gap:8px;margin-top:6px;">
          <span class="scard-price">${s.price}</span>
          ${s.insurance ? '<span class="tag tag-g" style="font-size:11px;">🛡️ Страховка</span>' : ''}
        </div>
      </div>
    </div>
  `).join('') || '<div style="padding:40px;text-align:center;color:var(--text-secondary);">Никого не найдено</div>';
}

function filterCatalog(val, el) {
  catalogFilter = val;
  document.querySelectorAll('#catalog-chips .chip').forEach(c => c.classList.remove('on'));
  el.classList.add('on');
  renderCatalog();
}

// ============================================================
// OPEN SPECIALIST — fill dynamic screen
// ============================================================
function openSpecialist(id) {
  const s = SPECIALISTS.find(x => x.id === id);
  if (!s) return;
  currentSpecId = id;

  document.getElementById('spec-topbar-name').textContent = s.name;
  const av = document.getElementById('spec-avatar');
  av.textContent = s.initials; av.style.background = s.grad;
  document.getElementById('spec-name').textContent = s.name;
  document.getElementById('spec-badge').className = 'tag ' + s.badgeType;
  document.getElementById('spec-badge').textContent = s.badge + ' Dogly';
  document.getElementById('spec-rating').textContent = s.rating;
  document.getElementById('spec-exp').textContent = s.exp;
  document.getElementById('spec-location').textContent = s.location;
  document.getElementById('spec-bio').textContent = s.bio;
  document.getElementById('spec-tags').innerHTML = s.tags.map(t => `<span class="tag tag-b">${t}</span>`).join('');

  // Services
  document.getElementById('spec-services').innerHTML = s.services.map((sv,i) => `
    <div class="pr ${sv.sel?'sel':''}" onclick="selectSvc(${i+1})" id="svc${i+1}">
      <div><div class="pr-n">${sv.name}</div><div style="font-size:12px;color:var(--text-secondary);">${sv.desc}</div></div>
      <div class="pr-v">${sv.price}</div>
    </div>
  `).join('');

  const mainPrice = s.services.find(sv=>sv.sel)?.price || s.services[0].price;
  document.getElementById('pay-full-desc').textContent = mainPrice + ' сразу';
  document.getElementById('pay-split-desc').textContent = '4 платежа без переплат';

  // Reviews
  const rb = document.getElementById('spec-reviews-block');
  const ratingNum = s.rating.replace('⭐ ','');
  rb.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
      <div style="font-size:40px;font-weight:900;font-family:'Nunito',sans-serif;color:var(--primary);">${ratingNum}</div>
      <div><div class="stars">${'⭐'.repeat(Math.round(parseFloat(ratingNum)))}</div><div style="font-size:13px;color:var(--text-secondary);">${s.reviews} отзывов</div></div>
    </div>
    <div style="border-top:1px solid var(--border);padding-top:14px;display:flex;flex-direction:column;gap:14px;">
      ${s.reviewList.map(r => `
        <div style="display:flex;gap:12px;">
          <div class="avatar" style="width:36px;height:36px;font-size:13px;background:${r.grad};">${r.av}</div>
          <div><div style="font-size:14px;font-weight:700;">${r.name}</div><div class="stars" style="font-size:12px;">${r.stars}</div><div style="font-size:13px;color:var(--text-secondary);margin-top:4px;">${r.text}</div></div>
        </div>
      `).join('')}
    </div>`;

  // Calendar
  const calEl = document.getElementById('spec-calendar');
  const days = ['','','','','','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30','31'];
  calEl.innerHTML = days.map((d,i) => {
    if (!d) return `<div class="cal-d dis"></div>`;
    const n = parseInt(d);
    if (n === 6) return `<div class="cal-d today">${d}</div>`;
    if (s.availDays.includes(n)) return `<div class="cal-d avail" onclick="pickDay(this)">${d}</div>`;
    return `<div class="cal-d dis">${d}</div>`;
  }).join('');

  // Reset tabs
  document.querySelectorAll('#specialist .tab').forEach((t,i) => t.classList.toggle('on', i===0));
  document.querySelectorAll('#specialist .tc').forEach((tc,i) => tc.classList.toggle('on', i===0));

  nav('specialist');
}

// ============================================================
// RENDER — HEALTH
// ============================================================
function renderHealth() {
  const list = document.getElementById('health-list');
  if (!list) return;
  const filtered = HEALTH_DATA.filter(h => {
    const matchFilter = healthFilter === 'Все' ? true : 
      (healthFilter === 'Клиника' ? h.type === 'clinic' : h.type === 'vet' && h.specType === healthFilter);
    return matchFilter;
  });

  // Section headers
  const clinics = filtered.filter(h => h.type === 'clinic');
  const vets = filtered.filter(h => h.type === 'vet');

  let html = '';
  if (vets.length) {
    html += `<div class="sec-hd"><div class="sec-t">Специалисты</div></div>`;
    html += vets.map(v => `
      <div class="scard" onclick="openSpecialistHealth('${v.id}')">
        <div class="avatar" style="width:56px;height:56px;font-size:22px;background:${v.grad};">${v.initials}</div>
        <div style="flex:1;">
          <div class="scard-name">${v.name}</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;">${v.spec}</div>
          <div class="scard-meta"><span class="tag ${v.badgeType}">${v.badge}</span><span class="stars">${v.rating}</span><span style="font-size:12px;color:var(--text-secondary);">(${v.reviews})</span></div>
          <div style="font-size:13px;color:var(--text-secondary);">${v.dist} • ${v.exp}</div>
          <div class="scard-price">${v.price}</div>
        </div>
      </div>
    `).join('');
  }
  if (clinics.length) {
    html += `<div class="sec-hd"><div class="sec-t">Клиники</div></div>`;
    html += clinics.map(c => `
      <div class="card" style="display:flex;gap:12px;cursor:pointer;margin-bottom:10px;" onclick="openClinicModal('${c.id}')">
        <div style="width:54px;height:54px;background:${c.grad};border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">${c.icon}</div>
        <div style="flex:1;">
          <div style="font-weight:800;font-size:15px;">${c.name}</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;">${c.subtitle}</div>
          <div style="font-size:13px;color:var(--text-secondary);">${c.addr}</div>
          <div style="font-size:13px;color:var(--text-secondary);">${c.hours} • ${c.rating}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">
            ${c.tags.map(t=>`<span class="tag tag-b" style="font-size:11px;">${t}</span>`).join('')}
          </div>
        </div>
      </div>
    `).join('');
  }
  list.innerHTML = html || '<div style="padding:40px;text-align:center;color:var(--text-secondary);">Ничего не найдено</div>';
}

// filterHealth перенесена в business.js

function openSpecialistHealth(id) {
  const v = HEALTH_DATA.find(x => x.id === id);
  if (!v) return;
  // Show vet detail via modal
  openClinicModal(id);
}

// Clinic/vet detail modal
// ============================================================
// EMERGENCY FUNCTIONS
// ============================================================
function openEmergency() {
  // Подтягиваем данные из профиля
  const p = JSON.parse(localStorage.getItem('df_profile') || '{}');
  const phone = localStorage.getItem('df_phone') || '+7 (495) 123-45-67';
  const name = p.name || 'Не указано';
  const petname = p.dogname || 'Не указано';
  
  // Показываем информацию из профиля (только для чтения)
  document.getElementById('em-display-name').textContent = name;
  document.getElementById('em-display-pet').textContent = petname;
  
  // Показываем номер телефона
  document.getElementById('em-phone').textContent = phone;
  
  // Заполняем адрес (можно редактировать)
  document.getElementById('em-address').value = p.district || '';
  document.getElementById('em-problem').value = '';
  
  openModal('m-emergency');
}

function submitEmergency() {
  const address = document.getElementById('em-address').value.trim();
  const problem = document.getElementById('em-problem').value.trim();
  const p = JSON.parse(localStorage.getItem('df_profile') || '{}');
  const name = p.name || 'Не указано';
  const petname = p.dogname || 'Не указано';
  
  if (!address || !problem) {
    alert('❌ Пожалуйста, заполните адрес и описание проблемы');
    return;
  }
  
  // В реальности здесь можно вызвать реальный номер
  // window.location.href = 'tel:+74951234567';
  alert('Сейчас вас свяжут с оператором\n\n' +
    'Ваши данные:\n' +
    `Владелец: ${name}\n` +
    `Питомец: ${petname}\n` +
    `Адрес: ${address}\n` +
    `Проблема: ${problem}`);
  closeModal('m-emergency');
}

function sendEmergencyRequest() {
  const address = document.getElementById('em-address').value.trim();
  const problem = document.getElementById('em-problem').value.trim();
  const p = JSON.parse(localStorage.getItem('df_profile') || '{}');
  const name = p.name || 'Не указано';
  const petname = p.dogname || 'Не указано';
  
  if (!address || !problem) {
    alert('❌ Пожалуйста, заполните адрес и описание проблемы');
    return;
  }
  
  // Сохраняем заявку (в реальности отправляется на сервер)
  const request = {
    id: Date.now(),
    name,
    address,
    petname,
    problem,
    timestamp: new Date().toLocaleString('ru-RU'),
    status: 'new'
  };
  
  // Сохраняем в localStorage для примера
  let requests = JSON.parse(localStorage.getItem('emergency_requests') || '[]');
  requests.push(request);
  localStorage.setItem('emergency_requests', JSON.stringify(requests));
  
  alert('✅ Ваша заявка отправлена!\n\n' +
    'Оператор свяжется с вами в ближайшее время.\n\n' +
    `Время отправки: ${request.timestamp}`);
  
  closeModal('m-emergency');
}

// ============================================================
function openClinicModal(id) {
  const item = HEALTH_DATA.find(x => x.id === id);
  if (!item) return;
  const m = document.getElementById('m-clinic');
  let html = '';
  if (item.type === 'clinic') {
    html = `
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px;">
        <div style="width:56px;height:56px;background:${item.grad};border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:26px;">${item.icon}</div>
        <div><div style="font-size:18px;font-weight:800;">${item.name}</div><div style="font-size:13px;color:var(--text-secondary);">${item.subtitle}</div></div>
      </div>
      <div style="font-size:14px;color:var(--text-secondary);line-height:1.6;margin-bottom:14px;">${item.desc}</div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
        <div style="font-size:14px;">${item.addr}</div>
        <div style="font-size:14px;">${item.hours}</div>
        <div style="font-size:14px;">${item.rating} • ${item.dist}</div>
        <div style="font-size:14px;font-weight:700;color:var(--primary);">${item.price}</div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;">
        ${item.tags.map(t=>`<span class="tag tag-b">${t}</span>`).join('')}
      </div>`;
  } else {
    html = `
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px;">
        <div class="avatar" style="width:56px;height:56px;font-size:22px;background:${item.grad};">${item.initials}</div>
        <div><div style="font-size:18px;font-weight:800;">${item.name}</div><div style="font-size:13px;color:var(--text-secondary);">${item.spec}</div></div>
      </div>
      <div style="font-size:14px;color:var(--text-secondary);line-height:1.6;margin-bottom:14px;">${item.bio}</div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
        <div style="font-size:14px;">${item.dist} • ${item.exp}</div>
        <div style="font-size:14px;">${item.rating} (${item.reviews} отзывов)</div>
        <div style="font-size:14px;font-weight:700;color:var(--primary);">${item.price}</div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;">
        ${item.tags.map(t=>`<span class="tag tag-b">${t}</span>`).join('')}
      </div>`;
  }
  document.getElementById('m-clinic-body').innerHTML = html;
  openModal('m-clinic');
}

// ============================================================
// PRIVATE CHAT — правильная архитектура пользователь ↔ пользователь
// chatId = userId собеседника
// Ably канал = "dm__" + sorted(myId, theirId) — одинаковый с обеих сторон
// ============================================================

