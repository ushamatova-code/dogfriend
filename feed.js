// ============================================================
// FEED.JS — Лента публикаций
// Depends on: globals.js (supabaseClient, currentUser, showToast, nav)
// ============================================================

let _feedPosts = [];
let _feedOffset = 0;
let _feedLoading = false;
let _feedHasMore = true;
const FEED_PAGE_SIZE = 20;

let _postPhotosData = []; // base64 фото для нового поста
let _postAuthorType = 'user'; // 'user' или business_id
let _currentPostId = null; // для модалки комментариев
let _userBusinesses = []; // бизнесы пользователя

// ════════════════════════════════════════════════════════════
// ИНИЦИАЛИЗАЦИЯ
// ════════════════════════════════════════════════════════════

async function renderFeed() {
  _feedPosts = [];
  _feedOffset = 0;
  _feedHasMore = true;

  const list = document.getElementById('feed-list');
  const loading = document.getElementById('feed-loading');
  if (list) list.innerHTML = '';
  if (loading) { loading.style.display = 'block'; loading.textContent = 'Загружаем ленту...'; }

  await loadFeedPosts();
  checkFeedDeeplink();
}

async function loadFeedPosts() {
  if (_feedLoading || !_feedHasMore) return;
  if (!supabaseClient) { showToast('Нет подключения'); return; }

  _feedLoading = true;
  const loading = document.getElementById('feed-loading');

  try {
    const { data, error } = await supabaseClient
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .range(_feedOffset, _feedOffset + FEED_PAGE_SIZE - 1);

    if (error) throw error;

    if (loading) loading.style.display = 'none';

    if (!data || data.length === 0) {
      _feedHasMore = false;
      if (_feedOffset === 0) {
        const list = document.getElementById('feed-list');
        if (list) list.innerHTML = `
          <div style="text-align:center;padding:60px 20px;color:var(--text-secondary);">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1.5" style="margin-bottom:16px;display:block;margin-left:auto;margin-right:auto;"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
            <div style="font-size:16px;font-weight:700;margin-bottom:8px;">Пока нет публикаций</div>
            <div style="font-size:13px;">Будьте первым — нажмите +</div>
          </div>`;
      }
      return;
    }

    // Загружаем лайки текущего пользователя для этих постов
    const myLikes = await getMyLikes(data.map(p => p.id));

    _feedPosts = [..._feedPosts, ...data];
    _feedOffset += data.length;
    if (data.length < FEED_PAGE_SIZE) _feedHasMore = false;

    renderFeedPosts(data, myLikes);

  } catch(e) {
    console.error('Feed load error:', e);
    if (loading) { loading.style.display = 'block'; loading.textContent = 'Ошибка загрузки'; }
  } finally {
    _feedLoading = false;
  }
}

async function getMyLikes(postIds) {
  if (!supabaseClient || !currentUser || !postIds.length) return new Set();
  try {
    const { data } = await supabaseClient
      .from('post_likes')
      .select('post_id')
      .eq('user_id', currentUser.id)
      .in('post_id', postIds);
    return new Set((data || []).map(l => l.post_id));
  } catch(e) { return new Set(); }
}

function renderFeedPosts(posts, myLikes) {
  const list = document.getElementById('feed-list');
  if (!list) return;

  posts.forEach(post => {
    const el = document.createElement('div');
    el.id = `feed-post-${post.id}`;
    el.innerHTML = buildPostCard(post, myLikes.has(post.id));
    list.appendChild(el);
  });

  // Подгрузка при прокрутке
  const scroll = document.querySelector('#community .scroll');
  if (scroll && _feedHasMore) {
    scroll.onscroll = () => {
      if (scroll.scrollTop + scroll.clientHeight >= scroll.scrollHeight - 100) {
        loadFeedPosts();
      }
    };
  }
}

function openUserProfileById(userId) {
  if (!userId) return;
  // Используем существующий механизм открытия профиля
  if (typeof openChatWithUser === 'function') {
    // Открываем профиль через модалку
    const contact = contactBook && contactBook[userId];
    const name = contact ? contact.name : 'Пользователь';
    const initials = name.slice(0,2).toUpperCase();
    showUserProfile(userId, name, initials, 'linear-gradient(135deg,#4A90D9,#7B5EA7)');
  }
}

function showUserProfile(userId, name, initials, grad) {
  let modal = document.getElementById('m-user-profile');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'm-user-profile';
    modal.className = 'modal-ov';
    modal.onclick = (e) => { if (e.target === modal) closeModal('m-user-profile'); };
    document.body.appendChild(modal);
  }
  modal.innerHTML = `<div class="modal" onclick="event.stopPropagation()" style="max-height:85%;overflow-y:auto;">
    <div class="mhandle"></div>
    <div id="m-user-profile-body"><div style="padding:20px;text-align:center;color:var(--text-secondary);">Загружаем...</div></div>
  </div>`;
  openModal('m-user-profile');

  // Загружаем профиль
  if (supabaseClient) {
    supabaseClient.from('profiles').select('*').eq('user_id', userId).single().then(({ data }) => {
      const body = document.getElementById('m-user-profile-body');
      if (!body) return;
      const p = data || {};
      const avatarHtml = p.avatar_url
        ? `<img src="${p.avatar_url}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;">`
        : `<div style="width:72px;height:72px;border-radius:50%;background:${grad};display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:700;color:white;">${initials}</div>`;
      body.innerHTML = `
        <div style="text-align:center;padding:16px 0 20px;">
          <div style="display:flex;justify-content:center;margin-bottom:12px;">${avatarHtml}</div>
          <div style="font-size:18px;font-weight:800;margin-bottom:4px;">${p.name || name}</div>
          ${p.district ? `<div style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">📍 ${p.district}</div>` : '<div style="margin-bottom:16px;"></div>'}
          <button class="btn btn-p" style="margin-bottom:8px;" onclick="closeModal('m-user-profile');openChatWithUser('${userId}','${p.name || name}','${initials}','${grad}')">
            Написать сообщение
          </button>
          <button class="btn btn-g" onclick="closeModal('m-user-profile')">Закрыть</button>
        </div>`;
    });
  }
}

function buildPostCard(post, iLiked) {
  const timeStr = formatPostTime(post.created_at);
  const avatarHtml = post.author_avatar
    ? `<img src="${post.author_avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
    : `<span style="font-size:16px;font-weight:700;color:white;">${(post.author_name||'?').substring(0,1).toUpperCase()}</span>`;

  const photosHtml = (post.photos && post.photos.length)
    ? `<div style="margin:10px 0;border-radius:12px;overflow:hidden;">${
        post.photos.length === 1
          ? `<img src="${post.photos[0]}" style="width:100%;max-height:400px;object-fit:contain;background:#f5f5f5;border-radius:12px;cursor:pointer;display:block;" onclick="openPhotoFull('${post.photos[0]}')">`
          : `<div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;">${post.photos.map(url => `<img src="${url}" style="width:100%;height:150px;object-fit:cover;cursor:pointer;" onclick="openPhotoFull('${url}')">`).join('')}</div>`
      }</div>`
    : '';

  const textHtml = post.text
    ? `<div style="font-size:14px;line-height:1.6;color:var(--text-primary);margin:8px 0;word-break:break-word;">${escFeed(post.text)}</div>`
    : '';

  const districtHtml = post.district
    ? `<span style="font-size:11px;color:var(--text-secondary);margin-left:6px;">· ${post.district}</span>`
    : '';

  const myId = currentUser && currentUser.id;
  const isAuthor = myId === post.user_id;

  return `
    <div style="background:var(--white);margin:8px 16px;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.06);padding:14px 16px;border:0.5px solid var(--border);">
      <!-- Шапка -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
        <div onclick="${!post.business_id ? `openUserProfileById('${post.user_id}')` : ''}" style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#4A90D9,#7B5EA7);flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;${!post.business_id ? 'cursor:pointer;' : ''}">
          ${avatarHtml}
        </div>
        <div style="flex:1;min-width:0;" onclick="${!post.business_id ? `openUserProfileById('${post.user_id}')` : ''}" style="cursor:pointer;">
          <div style="font-weight:700;font-size:14px;${!post.business_id ? 'cursor:pointer;' : ''}">${escFeed(post.author_name)}${districtHtml}</div>
          <div style="font-size:12px;color:var(--text-secondary);">${timeStr}</div>
        </div>
        <button onclick="showPostMenu('${post.id}', ${isAuthor})" style="background:none;border:none;font-size:20px;color:var(--text-secondary);cursor:pointer;padding:4px 8px;line-height:1;">···</button>
      </div>
      <!-- Контент -->
      ${textHtml}
      ${photosHtml}
      <!-- Действия -->
      <div style="display:flex;gap:20px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border);">
        <button id="like-btn-${post.id}" data-liked="${iLiked ? '1' : '0'}" onclick="togglePostLike('${post.id}')" style="display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;font-size:13px;font-weight:600;color:${iLiked ? '#E91E63' : 'var(--text-secondary)'};padding:0;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="${iLiked ? '#E91E63' : 'none'}" stroke="${iLiked ? '#E91E63' : 'currentColor'}" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
          <span id="likes-count-${post.id}">${post.likes_count || 0}</span>
        </button>
        <button onclick="openPostDetail('${post.id}')" style="display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;font-size:13px;font-weight:600;color:var(--text-secondary);padding:0;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          <span id="comments-count-${post.id}">${post.comments_count || 0}</span>
        </button>
        <button onclick="copyPostLink('${post.id}')" style="display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;font-size:13px;font-weight:600;color:var(--text-secondary);padding:0;margin-left:auto;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          Поделиться
        </button>
      </div>
    </div>`;
}

// ════════════════════════════════════════════════════════════
// СОЗДАНИЕ ПОСТА
// ════════════════════════════════════════════════════════════

async function openCreatePost() {
  if (!currentUser) { showToast('Войдите в аккаунт'); return; }
  _postPhotosData = [];
  _postAuthorType = 'user';

  // Загружаем бизнесы пользователя
  _userBusinesses = [];
  if (supabaseClient) {
    const { data } = await supabaseClient
      .from('businesses')
      .select('id, name, cover_url')
      .eq('user_id', currentUser.id);
    _userBusinesses = data || [];
  }

  // Рендерим выбор автора
  const picker = document.getElementById('post-author-picker');
  const profile = JSON.parse(localStorage.getItem('df_profile') || '{}');
  const avatarUrl = profile.avatar_url || '';
  const avatarHtml = avatarUrl
    ? `<img src="${avatarUrl}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;">`
    : `<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#4A90D9,#7B5EA7);display:flex;align-items:center;justify-content:center;font-size:12px;color:white;font-weight:700;">${(profile.name||'Я').substring(0,1)}</div>`;

  let pickerHtml = `
    <div id="author-btn-user" onclick="selectPostAuthor('user')" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:20px;border:2px solid var(--primary);background:rgba(74,144,217,0.08);cursor:pointer;">
      ${avatarHtml}
      <span style="font-size:13px;font-weight:700;color:var(--primary);">${escFeed(profile.name || 'Я')}</span>
    </div>`;

  _userBusinesses.forEach(biz => {
    const bizAvatar = biz.cover_url
      ? `<img src="${biz.cover_url}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;">`
      : `<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#F5A623,#F07B3F);display:flex;align-items:center;justify-content:center;font-size:12px;color:white;font-weight:700;">${(biz.name||'Б').substring(0,1)}</div>`;
    pickerHtml += `
      <div id="author-btn-${biz.id}" onclick="selectPostAuthor('${biz.id}')" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:20px;border:2px solid var(--border);cursor:pointer;">
        ${bizAvatar}
        <span style="font-size:13px;font-weight:600;color:var(--text-primary);">${escFeed(biz.name)}</span>
      </div>`;
  });

  if (picker) picker.innerHTML = pickerHtml;

  // Очищаем поля
  const textEl = document.getElementById('post-text');
  if (textEl) textEl.value = '';
  const preview = document.getElementById('post-photos-preview');
  if (preview) preview.innerHTML = '';

  openModal('m-create-post');
}

function selectPostAuthor(type) {
  _postAuthorType = type;
  // Сбрасываем все кнопки
  document.querySelectorAll('[id^="author-btn-"]').forEach(btn => {
    btn.style.border = '2px solid var(--border)';
    btn.style.background = 'none';
    const span = btn.querySelector('span');
    if (span) span.style.color = 'var(--text-primary)';
  });
  // Выделяем выбранную
  const selected = document.getElementById(`author-btn-${type}`);
  if (selected) {
    selected.style.border = '2px solid var(--primary)';
    selected.style.background = 'rgba(74,144,217,0.08)';
    const span = selected.querySelector('span');
    if (span) span.style.color = 'var(--primary)';
  }
}

function handlePostPhotos(event) {
  const files = Array.from(event.target.files);
  if (_postPhotosData.length + files.length > 5) {
    showToast('Максимум 5 фото');
    return;
  }
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      _postPhotosData.push({ base64: e.target.result, type: file.type });
      renderPostPhotosPreview();
    };
    reader.readAsDataURL(file);
  });
  event.target.value = '';
}

function renderPostPhotosPreview() {
  const preview = document.getElementById('post-photos-preview');
  if (!preview) return;
  preview.innerHTML = _postPhotosData.map((p, i) => `
    <div style="position:relative;width:70px;height:70px;">
      <img src="${p.base64}" style="width:70px;height:70px;object-fit:cover;border-radius:10px;">
      <button onclick="removePostPhoto(${i})" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:#FF3B30;color:white;border:none;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;padding:0;">×</button>
    </div>`).join('');
}

function removePostPhoto(index) {
  _postPhotosData.splice(index, 1);
  renderPostPhotosPreview();
}

async function submitPost() {
  if (!currentUser || !supabaseClient) { showToast('Войдите в аккаунт'); return; }

  const text = (document.getElementById('post-text').value || '').trim();
  if (!text && _postPhotosData.length === 0) {
    showToast('Напишите текст или добавьте фото');
    return;
  }

  showToast('Публикуем...', 'var(--primary)');

  try {
    // Определяем автора
    const profile = JSON.parse(localStorage.getItem('df_profile') || '{}');
    let authorName, authorAvatar, businessId = null;

    if (_postAuthorType === 'user') {
      authorName = profile.name || 'Пользователь';
      authorAvatar = profile.avatar_url || null;
    } else {
      const biz = _userBusinesses.find(b => b.id === _postAuthorType);
      authorName = biz ? biz.name : 'Бизнес';
      authorAvatar = biz ? (biz.cover_url || null) : null;
      businessId = _postAuthorType;
    }

    // Загружаем фото
    const photoUrls = [];
    for (let i = 0; i < _postPhotosData.length; i++) {
      const url = await uploadPostPhoto(_postPhotosData[i]);
      if (url) photoUrls.push(url);
    }

    const { data, error } = await supabaseClient.from('posts').insert({
      user_id: currentUser.id,
      business_id: businessId,
      author_name: authorName,
      author_avatar: authorAvatar,
      text: text || null,
      photos: photoUrls,
      district: profile.district || null,
    }).select().single();

    if (error) throw error;

    closeModal('m-create-post');
    showToast('Опубликовано!', '#34C759');

    // Добавляем пост в начало ленты
    const list = document.getElementById('feed-list');
    if (list) {
      const el = document.createElement('div');
      el.id = `feed-post-${data.id}`;
      el.innerHTML = buildPostCard(data, false);
      list.insertBefore(el, list.firstChild);
    }

  } catch(e) {
    console.error('Submit post error:', e);
    showToast('Ошибка публикации');
  }
}

async function uploadPostPhoto(photoData) {
  if (!supabaseClient) return null;
  try {
    const resp = await fetch(photoData.base64);
    const blob = await resp.blob();
    const ext = photoData.type.includes('png') ? 'png' : 'jpg';
    const path = `posts/${currentUser.id}_${Date.now()}_${Math.random().toString(36).substr(2,5)}.${ext}`;
    const { error } = await supabaseClient.storage.from('avatars').upload(path, blob, { upsert: true, contentType: photoData.type });
    if (error) throw error;
    const { data } = supabaseClient.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  } catch(e) {
    console.error('Photo upload error:', e);
    return null;
  }
}

// ════════════════════════════════════════════════════════════
// ЛАЙКИ
// ════════════════════════════════════════════════════════════

async function togglePostLike(postId) {
  if (!currentUser) { showToast('Войдите в аккаунт'); return; }
  if (!supabaseClient) return;

  const btn = document.getElementById(`like-btn-${postId}`);
  const countEl = document.getElementById(`likes-count-${postId}`);
  const svg = btn ? btn.querySelector('svg') : null;
  const isLiked = btn && btn.getAttribute('data-liked') === '1';
  const currentCount = parseInt(countEl ? countEl.textContent : '0') || 0;

  // Оптимистичное обновление UI
  const newLiked = !isLiked;
  if (btn && svg && countEl) {
    btn.setAttribute('data-liked', newLiked ? '1' : '0');
    svg.setAttribute('fill', newLiked ? '#E91E63' : 'none');
    svg.setAttribute('stroke', newLiked ? '#E91E63' : 'currentColor');
    btn.style.color = newLiked ? '#E91E63' : 'var(--text-secondary)';
    countEl.textContent = newLiked ? currentCount + 1 : Math.max(0, currentCount - 1);
  }

  try {
    if (isLiked) {
      await supabaseClient.from('post_likes').delete().eq('post_id', postId).eq('user_id', currentUser.id);
      await supabaseClient.from('posts').update({ likes_count: Math.max(0, currentCount - 1) }).eq('id', postId);
    } else {
      await supabaseClient.from('post_likes').insert({ post_id: postId, user_id: currentUser.id });
      await supabaseClient.from('posts').update({ likes_count: currentCount + 1 }).eq('id', postId);
    }
  } catch(e) {
    console.error('Like error:', e);
    // Откатываем UI при ошибке
    if (btn && svg && countEl) {
      btn.setAttribute('data-liked', isLiked ? '1' : '0');
      svg.setAttribute('fill', isLiked ? '#E91E63' : 'none');
      svg.setAttribute('stroke', isLiked ? '#E91E63' : 'currentColor');
      btn.style.color = isLiked ? '#E91E63' : 'var(--text-secondary)';
      countEl.textContent = currentCount;
    }
  }
}

// ════════════════════════════════════════════════════════════
// КОММЕНТАРИИ
// ════════════════════════════════════════════════════════════

async function openPostDetail(postId) {
  _currentPostId = postId;
  const post = _feedPosts.find(p => p.id === postId);
  const body = document.getElementById('m-post-detail-body');
  if (!body) return;

  body.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);">Загружаем...</div>';
  openModal('m-post-detail');

  try {
    // Загружаем комментарии
    const { data: comments, error } = await supabaseClient
      .from('post_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (error) throw error;

    const myLikes = post ? await getMyLikes([postId]) : new Set();
    const iLiked = myLikes.has(postId);

    let html = post ? buildPostCard(post, iLiked) : '';
    html += `<div style="padding:12px 16px 4px;font-size:13px;font-weight:700;color:var(--text-secondary);">КОММЕНТАРИИ (${comments.length})</div>`;

    if (!comments.length) {
      html += '<div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:13px;">Комментариев пока нет</div>';
    } else {
      comments.forEach(c => {
        const avatarHtml = c.author_avatar
          ? `<img src="${c.author_avatar}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">`
          : `<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#4A90D9,#7B5EA7);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:white;">${(c.author_name||'?').substring(0,1)}</div>`;
        html += `
          <div style="display:flex;gap:10px;padding:10px 16px;border-bottom:1px solid var(--border);">
            ${avatarHtml}
            <div style="flex:1;">
              <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:3px;">
                <span style="font-size:13px;font-weight:700;">${escFeed(c.author_name)}</span>
                <span style="font-size:11px;color:var(--text-secondary);">${formatPostTime(c.created_at)}</span>
              </div>
              <div style="font-size:13px;color:var(--text-primary);line-height:1.5;">${escFeed(c.text)}</div>
            </div>
          </div>`;
      });
    }
    body.innerHTML = html;
  } catch(e) {
    console.error('Load comments error:', e);
    body.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);">Ошибка загрузки</div>';
  }
}

async function submitComment() {
  if (!currentUser) { showToast('Войдите в аккаунт'); return; }
  const input = document.getElementById('comment-input');
  const text = (input ? input.value : '').trim();
  if (!text) return;
  if (!_currentPostId || !supabaseClient) return;

  const profile = JSON.parse(localStorage.getItem('df_profile') || '{}');
  input.value = '';

  try {
    const { error } = await supabaseClient.from('post_comments').insert({
      post_id: _currentPostId,
      user_id: currentUser.id,
      author_name: profile.name || 'Пользователь',
      author_avatar: profile.avatar_url || null,
      text: text
    });
    if (error) throw error;

    // Обновляем счётчик в посте
    const post = _feedPosts.find(p => p.id === _currentPostId);
    if (post) {
      post.comments_count = (post.comments_count || 0) + 1;
      const countEl = document.getElementById(`comments-count-${_currentPostId}`);
      if (countEl) countEl.textContent = post.comments_count;
    }

    // Обновляем счётчик в БД
    const newCount = (post ? post.comments_count : 1);
    await supabaseClient.from('posts').update({ comments_count: newCount }).eq('id', _currentPostId);

    // Перезагружаем комментарии
    openPostDetail(_currentPostId);
  } catch(e) {
    console.error('Comment error:', e);
    showToast('Ошибка отправки');
  }
}

// ════════════════════════════════════════════════════════════
// МЕНЮ ПОСТА (··· кнопка)
// ════════════════════════════════════════════════════════════

function showPostMenu(postId, isAuthor) {
  // Удаляем старое меню
  const old = document.getElementById('post-menu-popup');
  if (old) old.remove();

  const menu = document.createElement('div');
  menu.id = 'post-menu-popup';
  menu.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--white);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.2);z-index:99999;min-width:220px;overflow:hidden;';

  let html = `
    <div onclick="copyPostLink('${postId}');document.getElementById('post-menu-popup').remove();" style="padding:16px;font-size:15px;font-weight:600;cursor:pointer;border-bottom:1px solid var(--border);">🔗 Скопировать ссылку</div>`;

  if (isAuthor) {
    html += `<div onclick="deletePost('${postId}');document.getElementById('post-menu-popup').remove();" style="padding:16px;font-size:15px;font-weight:600;cursor:pointer;color:#FF3B30;">🗑 Удалить пост</div>`;
  } else {
    html += `<div onclick="document.getElementById('post-menu-popup').remove();showToast('Жалоба отправлена');" style="padding:16px;font-size:15px;font-weight:600;cursor:pointer;color:var(--text-secondary);">⚠️ Пожаловаться</div>`;
  }

  html += `<div onclick="document.getElementById('post-menu-popup').remove();" style="padding:16px;font-size:15px;font-weight:600;cursor:pointer;text-align:center;color:var(--text-secondary);border-top:1px solid var(--border);">Отмена</div>`;

  menu.innerHTML = html;

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99998;background:rgba(0,0,0,0.3);';
  overlay.onclick = () => { menu.remove(); overlay.remove(); };

  document.body.appendChild(overlay);
  document.body.appendChild(menu);
}

// ════════════════════════════════════════════════════════════
// УДАЛЕНИЕ ПОСТА
// ════════════════════════════════════════════════════════════

async function deletePost(postId) {
  if (!confirm('Удалить этот пост?')) return;
  if (!supabaseClient) return;

  try {
    const { error } = await supabaseClient.from('posts').delete().eq('id', postId).eq('user_id', currentUser.id);
    if (error) throw error;

    const el = document.getElementById(`feed-post-${postId}`);
    if (el) el.remove();
    _feedPosts = _feedPosts.filter(p => p.id !== postId);
    showToast('Пост удалён', '#FF3B30');
  } catch(e) {
    console.error('Delete post error:', e);
    showToast('Ошибка удаления');
  }
}

// ════════════════════════════════════════════════════════════
// ШЕРИНГ — ССЫЛКА НА ПОСТ
// ════════════════════════════════════════════════════════════

function copyPostLink(postId) {
  const url = `${location.origin}${location.pathname}?post=${postId}`;
  navigator.clipboard.writeText(url)
    .then(() => showToast('Ссылка скопирована!', '#34C759'))
    .catch(() => showToast('Ссылка: ' + url));
}

// ════════════════════════════════════════════════════════════
// DEEPLINK — открытие поста по ссылке
// ════════════════════════════════════════════════════════════

function checkFeedDeeplink() {
  const params = new URLSearchParams(location.search);
  const postId = params.get('post');
  if (!postId) return;

  // Переходим на ленту и открываем пост
  switchCommTab('feed');
  setTimeout(() => openPostDetail(postId), 500);

  // Убираем параметр из URL
  const newUrl = location.pathname;
  history.replaceState({}, '', newUrl);
}

// ════════════════════════════════════════════════════════════
// ПРОСМОТР ФОТО
// ════════════════════════════════════════════════════════════

function openPhotoFull(url) {
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);z-index:99999;display:flex;align-items:center;justify-content:center;';
  ov.onclick = () => ov.remove();
  ov.innerHTML = `<img src="${url}" style="max-width:95%;max-height:90%;border-radius:8px;object-fit:contain;">`;
  document.body.appendChild(ov);
}

// ════════════════════════════════════════════════════════════
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ════════════════════════════════════════════════════════════

function escFeed(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

function formatPostTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'только что';
  if (diff < 3600) return Math.floor(diff / 60) + ' мин назад';
  if (diff < 86400) return Math.floor(diff / 3600) + ' ч назад';
  if (diff < 604800) return Math.floor(diff / 86400) + ' дн назад';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

// Проверяем deeplink при загрузке страницы
window.addEventListener('load', () => {
  const params = new URLSearchParams(location.search);
  if (params.get('post')) {
    setTimeout(() => {
      nav('chatList');
      switchCommTab('feed');
      setTimeout(() => openPostDetail(params.get('post')), 800);
      history.replaceState({}, '', location.pathname);
    }, 1500);
  }
});
