// ============================================================
// PETS.JS — Pets CRUD + Medical records
// Depends on: globals.js
// ВСЕ переменные объявлены в globals.js
// ============================================================


function selectPetSex(s) {
  _petSex = s;
  document.getElementById('pet-sex-m').classList.toggle('on', s==='м');
  document.getElementById('pet-sex-f').classList.toggle('on', s==='ж');
}

async function savePet() {
  if (!currentUser) { showToast('Войдите в аккаунт'); return; }
  const name = document.getElementById('new-pet-name').value.trim();
  const breed = document.getElementById('new-pet-breed').value.trim();
  if (!name) { showToast('Введите кличку'); return; }

  showToast('Сохраняем...', 'var(--primary)');

  try {
    // 1. Создаём запись в Supabase
    const { data: pet, error } = await supabaseClient.from('pets').insert({
      user_id: currentUser.id,
      name: name,
      breed: breed,
      age: document.getElementById('new-pet-age').value.trim(),
      weight: document.getElementById('new-pet-weight').value.trim(),
      sex: _petSex,
      dob: document.getElementById('new-pet-dob').value || null,
      notes: document.getElementById('new-pet-notes').value.trim()
    }).select().single();
    if (error) throw error;

    // 2. Загружаем фото если есть
    if (_newPetPhotoData && pet) {
      await uploadPetPhoto(pet.id, _newPetPhotoData);
    }

    closeModal('m-add-pet');
    _newPetPhotoData = null;
    const preview = document.getElementById('new-pet-photo-preview');
    if (preview) {
      preview.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
      preview.style.border = '2px dashed var(--border)';
    }
    // Очищаем поля
    document.getElementById('new-pet-name').value = '';
    document.getElementById('new-pet-breed').value = '';
    document.getElementById('new-pet-age').value = '';
    document.getElementById('new-pet-weight').value = '';
    document.getElementById('new-pet-dob').value = '';
    document.getElementById('new-pet-notes').value = '';

    renderPets();
    showToast(name + ' добавлен!', '#34C759');
  } catch(e) {
    console.error('Save pet error:', e);
    showToast('Ошибка сохранения');
  }
}

async function uploadPetPhoto(petId, base64Data) {
  if (!supabaseClient || !petId) return;
  try {
    // Конвертируем base64 в blob
    const resp = await fetch(base64Data);
    const blob = await resp.blob();
    const ext = blob.type.includes('png') ? 'png' : 'jpg';
    const filePath = `pets/${petId}.${ext}`;

    const { error: uploadError } = await supabaseClient.storage
      .from('avatars')
      .upload(filePath, blob, { upsert: true, contentType: blob.type });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabaseClient.storage
      .from('avatars')
      .getPublicUrl(filePath);
    const photoUrl = urlData.publicUrl + '?t=' + Date.now();

    // Обновляем запись питомца
    await supabaseClient.from('pets').update({ photo_url: photoUrl }).eq('id', petId);
  } catch(e) {
    console.error('Pet photo upload error:', e);
  }
}

async function deletePet(id) {
  if (!supabaseClient) return;
  try {
    const { error } = await supabaseClient.from('pets').delete().eq('id', id);
    if (error) throw error;
    renderPets();
    showToast('Питомец удалён');
  } catch(e) {
    console.error('Delete pet error:', e);
    showToast('Ошибка удаления');
  }
}

function togglePetCard(idx) {
  const b=document.getElementById('pet-bdy-'+idx), a=document.getElementById('pet-arr-'+idx);
  const open=b.style.display==='none';
  b.style.display=open?'block':'none'; a.textContent=open?'⌄':'›';
}

async function renderPets() {
  const list = document.getElementById('pets-list');
  if (!list) return;

  if (!supabaseClient || !currentUser) {
    list.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--text-secondary);font-size:14px;">Войдите чтобы увидеть питомцев</div>';
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from('pets')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: true });
    if (error) throw error;

    _petsCache = data || [];

    if (!_petsCache.length) {
      list.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--text-secondary);"><svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1.5" stroke-linecap="round" style="margin-bottom:16px;"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg><div style="font-size:16px;font-weight:700;margin-bottom:8px;">Питомцев пока нет</div><div style="font-size:13px;">Нажмите «+ Добавить»</div></div>';
      return;
    }

    const GRADS = ['linear-gradient(135deg,#4A90D9,#7B5EA7)','linear-gradient(135deg,#E91E63,#FF9800)','linear-gradient(135deg,#00BCD4,#4CAF50)','linear-gradient(135deg,#FF5722,#FF9800)','linear-gradient(135deg,#9C27B0,#E91E63)'];

    list.innerHTML = _petsCache.map((pet, i) => {
      const color = GRADS[i % GRADS.length];
      const initials = pet.name ? pet.name.substring(0,1).toUpperCase() : '?';
      return `<div class="pet-card">
        <div class="pet-hdr" onclick="togglePetCard(${i})">
          <div style="width:56px;height:56px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;flex-shrink:0;${pet.photo_url ? '' : 'background:'+color+';color:white;font-size:22px;font-weight:800;'}">
            ${pet.photo_url ? `<img src="${pet.photo_url}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.style.background='${color}';this.parentElement.textContent='${initials}'">` : initials}
          </div>
          <div style="flex:1;">
            <div style="font-size:16px;font-weight:800;">${pet.name} ${pet.sex==='ж'?'♀':'♂'}</div>
            <div style="font-size:13px;color:var(--text-secondary);">${pet.breed || 'Порода не указана'}${pet.age ? ' · '+pet.age : ''}</div>
          </div>
          <div style="font-size:22px;color:var(--border);" id="pet-arr-${i}">›</div>
        </div>
        <div id="pet-bdy-${i}" class="pet-bdy" style="display:none;">
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;padding-top:12px;">
            ${pet.weight ? `<div style="background:var(--bg);border-radius:10px;padding:8px 12px;text-align:center;"><div style="font-size:16px;font-weight:800;">${pet.weight} кг</div><div style="font-size:11px;color:var(--text-secondary);">Вес</div></div>` : ''}
            ${pet.dob ? `<div style="background:var(--bg);border-radius:10px;padding:8px 12px;text-align:center;"><div style="font-size:13px;font-weight:800;">${pet.dob}</div><div style="font-size:11px;color:var(--text-secondary);">Дата рожд.</div></div>` : ''}
          </div>
          ${pet.notes ? `<div style="font-size:13px;color:var(--text-secondary);margin-bottom:10px;">${pet.notes}</div>` : ''}
          <div style="display:flex;gap:8px;">
            <button class="btn btn-g btn-sm" style="flex:1;" onclick="nav('medRecords')">Мед. записи</button>
            <button class="btn btn-sm" style="flex:1;background:rgba(208,2,27,0.08);color:var(--error);border-radius:10px;height:38px;font-size:13px;font-weight:700;" onclick="deletePet('${pet.id}')">Удалить</button>
          </div>
        </div>
      </div>`;
    }).join('');
  } catch(e) {
    console.error('Render pets error:', e);
    list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-secondary);">Ошибка загрузки</div>';
  }
}

// ════════════════════════════════════════════════════════════
// MED RECORDS
// ════════════════════════════════════════════════════════════
const MED_ICONS={
  'Вакцинация':'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4A90D9" stroke-width="2" stroke-linecap="round"><path d="M19.5 2.5l2 2-5 5-2-2"/><path d="M14.5 7.5l-8 8-3 3"/><path d="M9.5 12.5l2 2"/></svg>',
  'Приём':'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2" stroke-linecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  'Анализ':'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9C27B0" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  'Операция':'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D0021B" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>',
  'Другое':'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>'
};
const MED_BG={'Вакцинация':'rgba(74,144,217,.1)','Приём':'rgba(76,175,80,.1)','Анализ':'rgba(156,39,176,.1)','Операция':'rgba(208,2,27,.1)','Другое':'rgba(142,142,147,.08)'};

function selectMedType(t,el){_medType=t;document.querySelectorAll('#med-type-chips .chip').forEach(c=>c.classList.remove('on'));el.classList.add('on');}

// Auto-fill pets dropdown when modal opens
const _origOpenModal = window.openModal;
window.openModal = function(id) {
  _origOpenModal(id);
  if (id === 'm-add-med') {
    // Load pets if not cached yet
    const fillPets = () => {
      const select = document.getElementById('med-pet-name');
      if (select && _petsCache && _petsCache.length) {
        select.innerHTML = '<option value="">Выберите питомца</option>' + 
          _petsCache.map(p => `<option value="${p.name}">${p.name}${p.breed ? ' (' + p.breed + ')' : ''}</option>`).join('');
      }
    };
    
    if (_petsCache && _petsCache.length) {
      fillPets();
    } else if (supabaseClient && currentUser) {
      // Load pets from Supabase
      supabaseClient.from('pets').select('*').eq('user_id', currentUser.id).then(({ data }) => {
        if (data) _petsCache = data;
        fillPets();
      });
    }
    
    // Prefill today's date
    const dateInput = document.getElementById('med-date');
    if (dateInput && !dateInput.value) {
      dateInput.value = new Date().toISOString().split('T')[0];
    }
  }
};

async function saveMedRecord(){
  const title=document.getElementById('med-title').value.trim();
  if(!title){showToast('Укажите название/диагноз');return;}
  
  const rec = {
    type: _medType,
    pet_name: document.getElementById('med-pet-name').value.trim(),
    title: title,
    date: document.getElementById('med-date').value,
    doctor: document.getElementById('med-doctor').value.trim(),
    notes: document.getElementById('med-notes').value.trim()
  };

  if (supabaseClient && currentUser) {
    try {
      const { error } = await supabaseClient.from('med_records').insert({
        ...rec,
        user_id: currentUser.id
      });
      if (error) throw error;
    } catch(e) {
      console.error('Save med record error:', e);
      // Fallback — localStorage
      let recs = JSON.parse(localStorage.getItem('df_med_records')||'[]');
      recs.unshift({ id: Date.now(), ...rec, petName: rec.pet_name });
      localStorage.setItem('df_med_records', JSON.stringify(recs));
    }
  } else {
    let recs = JSON.parse(localStorage.getItem('df_med_records')||'[]');
    recs.unshift({ id: Date.now(), ...rec, petName: rec.pet_name });
    localStorage.setItem('df_med_records', JSON.stringify(recs));
  }
  
  closeModal('m-add-med');
  await renderMedRecords();
  showToast('Запись сохранена','#7ED321');
}

async function renderMedRecords(){
  const list=document.getElementById('med-records-list');
  if(!list)return;
  
  let recs = [];
  
  if (supabaseClient && currentUser) {
    try {
      const { data, error } = await supabaseClient
        .from('med_records')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      recs = (data || []).map(r => ({
        id: r.id,
        type: r.type,
        petName: r.pet_name,
        title: r.title,
        date: r.date,
        doctor: r.doctor,
        notes: r.notes
      }));
      _medRecordsCache = recs;
    } catch(e) {
      console.error('Load med records error:', e);
      recs = JSON.parse(localStorage.getItem('df_med_records')||'[]');
    }
  } else {
    recs = JSON.parse(localStorage.getItem('df_med_records')||'[]');
  }

  if(!recs.length){
    list.innerHTML = `<div style="padding:60px 20px;text-align:center;color:var(--text-secondary);">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1.5" style="margin-bottom:12px;"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
      <div style="font-weight:700;margin-bottom:4px;">Нет записей</div>
      <div style="font-size:13px;">Нажмите + чтобы добавить первую запись</div>
    </div>`;
    return;
  }

  list.innerHTML=recs.map(r=>`
    <div id="med-${r.id}" class="med-record-item" onclick="openMedRecord('${r.id}')" style="background:var(--white);border-radius:16px;margin-bottom:10px;box-shadow:var(--shadow);padding:14px 16px;display:flex;gap:12px;align-items:flex-start;cursor:pointer;position:relative;transition:transform 0.2s;">
      <div style="width:44px;height:44px;background:${MED_BG[r.type]||'rgba(0,0,0,.06)'};border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${MED_ICONS[r.type]||MED_ICONS['Другое']}</div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
          <div style="font-weight:800;font-size:14px;">${r.title}</div>
          <span style="font-size:11px;color:var(--text-secondary);background:var(--bg);padding:2px 8px;border-radius:6px;flex-shrink:0;">${r.type}</span>
        </div>
        ${r.petName?`<div style="font-size:12px;color:var(--primary);font-weight:600;margin-top:3px;display:flex;align-items:center;gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg> ${r.petName}</div>`:''}
        <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;display:flex;align-items:center;gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg> ${r.date||'Без даты'}${r.doctor?' · '+r.doctor:''}</div>
        ${r.notes?`<div style="font-size:12px;color:var(--text-secondary);margin-top:3px;font-style:italic;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.notes}</div>`:''}
      </div>
    </div>`).join('');
    
  // Добавляем свайп для удаления
  document.querySelectorAll('.med-record-item').forEach(item => {
    let startX = 0;
    let currentX = 0;
    
    item.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
    });
    
    item.addEventListener('touchmove', (e) => {
      currentX = e.touches[0].clientX;
      const diff = startX - currentX;
      if (diff > 0 && diff < 100) {
        item.style.transform = `translateX(-${diff}px)`;
        item.querySelector('button').style.opacity = diff / 100;
      }
    });
    
    item.addEventListener('touchend', () => {
      const diff = startX - currentX;
      if (diff > 50) {
        item.style.transform = 'translateX(-80px)';
        item.querySelector('button').style.opacity = '1';
      } else {
        item.style.transform = 'translateX(0)';
        item.querySelector('button').style.opacity = '0';
      }
    });
  });
}

function openMedRecord(id) {
  const rec = _medRecordsCache.find(r => String(r.id) === String(id));
  if (!rec) return;
  
  let modal = document.getElementById('m-view-med');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'm-view-med';
    modal.className = 'modal-ov';
    modal.onclick = (e) => { if (e.target === modal) closeModal('m-view-med'); };
    document.body.appendChild(modal);
  }
  
  modal.innerHTML = `<div class="modal" onclick="event.stopPropagation()" style="max-height:85%;overflow-y:auto;">
    <div class="mhandle"></div>
    <div style="padding:4px 0 16px;">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;">
        <div style="width:56px;height:56px;background:${MED_BG[rec.type]||'rgba(0,0,0,.06)'};border-radius:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${MED_ICONS[rec.type]||MED_ICONS['Другое']}</div>
        <div style="flex:1;">
          <div style="font-weight:800;font-size:17px;margin-bottom:4px;">${rec.title}</div>
          <span style="font-size:12px;color:var(--text-secondary);background:var(--bg);padding:3px 10px;border-radius:6px;">${rec.type}</span>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:20px;">
        ${rec.petName?`<div style="display:flex;align-items:center;gap:10px;">
          <div style="width:36px;height:36px;border-radius:10px;background:rgba(74,144,217,0.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg></div>
          <div><div style="font-size:12px;color:var(--text-secondary);">Питомец</div><div style="font-weight:700;font-size:14px;">${rec.petName}</div></div>
        </div>`:''}
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:36px;height:36px;border-radius:10px;background:rgba(74,144,217,0.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg></div>
          <div><div style="font-size:12px;color:var(--text-secondary);">Дата</div><div style="font-weight:700;font-size:14px;">${rec.date || 'Не указана'}</div></div>
        </div>
        ${rec.doctor?`<div style="display:flex;align-items:center;gap:10px;">
          <div style="width:36px;height:36px;border-radius:10px;background:rgba(74,144,217,0.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
          <div><div style="font-size:12px;color:var(--text-secondary);">Врач / клиника</div><div style="font-weight:700;font-size:14px;">${rec.doctor}</div></div>
        </div>`:''}
      </div>
      ${rec.notes?`<div style="padding:14px;background:var(--bg);border-radius:14px;margin-bottom:20px;">
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;">Заметки</div>
        <div style="font-size:14px;line-height:1.5;">${rec.notes}</div>
      </div>`:''}
      <button class="btn btn-g" onclick="closeModal('m-view-med')" style="margin-bottom:8px;">Закрыть</button>
      <button class="btn" style="background:rgba(208,2,27,0.08);color:#D0021B;width:100%;" onclick="closeModal('m-view-med');deleteMedRecord('${rec.id}')">Удалить запись</button>
    </div>
  </div>`;
  
  openModal('m-view-med');
}

async function deleteMedRecord(id) {
  if (!confirm('Удалить запись?')) return;
  
  if (supabaseClient && currentUser) {
    try {
      const { error } = await supabaseClient.from('med_records').delete().eq('id', id).eq('user_id', currentUser.id);
      if (error) throw error;
    } catch(e) {
      console.error('Delete med record error:', e);
    }
  } else {
    let recs = JSON.parse(localStorage.getItem('df_med_records')||'[]');
    recs = recs.filter(r => String(r.id) !== String(id));
    localStorage.setItem('df_med_records', JSON.stringify(recs));
  }
  
  await renderMedRecords();
  showToast('Запись удалена', '#FF3B30');
}

