// ============================================================
// SOCIAL.JS — Друзья + Посты в профиле пользователя
// Depends on: globals.js, feed.js
// ============================================================

let _myFriends = [];
let _friendRequests = [];
let _profilePostsCache = [];

// ════════════════════════════════════════════════════════════
// ДРУЗЬЯ — ЗАГРУЗКА
// ════════════════════════════════════════════════════════════

async function loadMyFriends() {
  if (!supabaseClient || !currentUser) return;
  try {
    const { data, error } = await supabaseClient
      .from('friends')
      .select('*')
      .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`)
      .eq('status', 'accepted');
    if (error) throw error;

    const friendIds = (data || []).map(f =>
      f.user_id === currentUser.id ? f.friend_id : f.user_id
    );

    if (!friendIds.length) { _myFriends = []; return; }

    const { data: profiles } = await supabaseClient
      .from('profiles')
      .select('user_id, name, district, avatar_url')
      .in('user_id', friendIds);

    _myFriends = friendIds.map(fid => {
      const p = (profiles || []).find(pr => pr.user_id === fid) || {};
      return { id: fid, name: p.name || 'Пользователь', district: p.district || '', avatar_url: p.avatar_url || null };
    });
  } catch(e) {
    console.error('Load friends error:', e);
  }
}

async function loadFriendRequests() {
  if (!supabaseClient || !currentUser) return;
  try {
    const { data, error } = await supabaseClient
      .from('friends')
      .select('*')
      .eq('friend_id', currentUser.id)
      .eq('status', 'pending');
    if (error) throw error;

    if (!data || !data.length) { _friendRequests = []; return; }

    const senderIds = data.map(r => r.user_id);
    const { data: profiles } = await supabaseClient
      .from('profiles')
      .select('user_id, name, avatar_url')
      .in('user_id', senderIds);

    _friendRequests = data.map(r => {
      const p = (profiles || []).find(pr => pr.user_id === r.user_id) || {};
      return { ...r, sender_name: p.name || 'Пользователь', sender_avatar: p.avatar_url || null };
    });
  } catch(e) {
    console.error('Load friend requests error:', e);
  }
}

// ════════════════════════════════════════════════════════════
// ДРУЗЬЯ — ДЕЙСТВИЯ
// ════════════════════════════════════════════════════════════

async function sendFriendRequest(friendId) {
  if (!supabaseClient || !currentUser || friendId === currentUser.id) return;
  try {
    const { data: existing } = await supabaseClient
      .from('friends')
      .select('id, status')
      .or(`and(user_id.eq.${currentUser.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${currentUser.id})`)
      .limit(1);

    if (existing && existing.length > 0) {
      const st = existing[0].status;
      if (st === 'accepted') { showToast('Вы уже друзья'); return; }
      if (st === 'pending') { showToast('Запрос уже отправлен'); return; }
    }

    const { error } = await supabaseClient.from('friends').insert({
      user_id: currentUser.id,
      friend_id: friendId,
      status: 'pending'
    });
    if (error) throw error;

    showToast('Запрос отправлен!', '#34C759');
    _updateFriendBtnUI(friendId, 'pending_sent');

    const profile = JSON.parse(localStorage.getItem('df_profile') || '{}');
    if (typeof sendPushToUser === 'function') {
      sendPushToUser(friendId, {
        title: (profile.name || 'Кто-то') + ' хочет добавить вас в друзья 🐕',
        message: 'Откройте профиль чтобы принять запрос',
        url: '/',
        type: 'friend_request'
      });
    }
  } catch(e) {
    console.error('Send friend request error:', e);
    showToast('Ошибка отправки');
  }
}

async function acceptFriend(requestId, senderId) {
  if (!supabaseClient) return;
  try {
    const { error } = await supabaseClient
      .from('friends')
      .update({ status: 'accepted' })
      .eq('id', requestId);
    if (error) throw error;

    showToast('Друг добавлен!', '#34C759');
    await loadFriendRequests();
    await loadMyFriends();
    renderFriendRequests();
    renderFriendsList();
    _updateFriendBtnUI(senderId, 'accepted');
  } catch(e) {
    console.error('Accept friend error:', e);
    showToast('Ошибка');
  }
}

async function declineFriend(requestId) {
  if (!supabaseClient) return;
  try {
    const { error } = await supabaseClient.from('friends').delete().eq('id', requestId);
    if (error) throw error;
    showToast('Запрос отклонён');
    await loadFriendRequests();
    renderFriendRequests();
  } catch(e) {
    console.error('Decline friend error:', e);
  }
}

async function removeFriend(friendId) {
  if (!confirm('Удалить из друзей?')) return;
  if (!supabaseClient || !currentUser) return;
  try {
    await supabaseClient
      .from('friends')
      .delete()
      .or(`and(user_id.eq.${currentUser.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${currentUser.id})`);
    showToast('Удалён из друзей');
    await loadMyFriends();
    renderFriendsList();
    _updateFriendBtnUI(friendId, 'none');
  } catch(e) {
    console.error('Remove friend error:', e);
    showToast('Ошибка');
  }
}

async function _getFriendStatus(userId) {
  if (!supabaseClient || !currentUser || userId === currentUser.id) return 'self';
  try {
    const { data } = await supabaseClient
      .from('friends')
      .select('id, status, user_id, friend_id')
      .or(`and(user_id.eq.${currentUser.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${currentUser.id})`)
      .limit(1);

    if (!data || !data.length) return 'none';
    const row = data[0];
    if (row.status === 'accepted') return 'accepted';
    if (row.status === 'pending' && row.user_id === currentUser.id) return 'pending_sent';
    if (row.status === 'pending' && row.friend_id === currentUser.id) return 'pending_received';
    return row.status;
  } catch(e) { return 'none'; }
}

function _updateFriendBtnUI(userId, status) {
  const btn = document.getElementById('friend-btn-' + userId);
  if (!btn) return;

  const friend = _myFriends.find(f => f.id === userId);
  const contact = (typeof contactBook !== 'undefined') ? contactBook[userId] : null;
  const name = (friend && friend.name) || (contact && contact.name) || 'Пользователь';
  const safeName = name.replace(/'/g, "\\'");
  const initials = name.substring(0, 2).toUpperCase();

  switch (status) {
    case 'accepted':
      btn.outerHTML = '<div id="friend-btn-' + userId + '" style="display:flex;gap:8px;width:100%;">' +
        '<button class="btn btn-p" style="flex:1;font-size:13px;" onclick="openChatWithUser(\'' + userId + '\',\'' + safeName + '\',\'' + initials + '\',\'linear-gradient(135deg,#4A90D9,#7B5EA7)\')">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" style="margin-right:4px;"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>Написать</button>' +
        '<button class="btn" style="font-size:12px;background:rgba(239,68,68,0.08);color:#EF4444;border:1px solid rgba(239,68,68,0.15);" onclick="removeFriend(\'' + userId + '\')">Удалить</button>' +
        '</div>';
      break;
    case 'pending_sent':
      btn.outerHTML = '<button id="friend-btn-' + userId + '" class="btn btn-g" style="width:100%;font-size:13px;opacity:0.7;" disabled>⏳ Запрос отправлен</button>';
      break;
    case 'none':
      btn.outerHTML = '<button id="friend-btn-' + userId + '" class="btn btn-p" style="width:100%;font-size:13px;" onclick="sendFriendRequest(\'' + userId + '\')">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" style="margin-right:6px;"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>' +
        'Добавить в друзья</button>';
      break;
  }
}

// ════════════════════════════════════════════════════════════
// РЕНДЕР — СПИСОК ДРУЗЕЙ
// ════════════════════════════════════════════════════════════

function renderFriendsList() {
  const list = document.getElementById('friends-list');
  if (!list) return;

  if (!_myFriends.length) {
    list.innerHTML = '<div style="text-align:center;padding:48px 20px;color:var(--text-secondary);">' +
      '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1.5" style="display:block;margin:0 auto 12px;"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>' +
      '<div style="font-size:16px;font-weight:700;margin-bottom:6px;">Пока нет друзей</div>' +
      '<div style="font-size:13px;line-height:1.5;">Откройте профиль пользователя<br>в ленте или чате, чтобы добавить</div></div>';
    return;
  }

  list.innerHTML = _myFriends.map(function(f) {
    var initials = f.name.substring(0, 2).toUpperCase();
    var avatarInner = f.avatar_url
      ? '<img src="' + f.avatar_url + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.parentElement.textContent=\'' + initials + '\'">'
      : '<span style="font-size:16px;font-weight:700;color:white;">' + initials + '</span>';
    return '<div onclick="openFullUserProfile(\'' + f.id + '\')" style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid var(--border);cursor:pointer;">' +
      '<div style="width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,#4A90D9,#7B5EA7);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;">' + avatarInner + '</div>' +
      '<div style="flex:1;min-width:0;"><div style="font-weight:700;font-size:15px;">' + _escS(f.name) + '</div>' +
      (f.district ? '<div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">📍 ' + _escS(f.district) + '</div>' : '') +
      '</div><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>';
  }).join('');
}

function renderFriendRequests() {
  var container = document.getElementById('friend-requests-section');
  if (!container) return;

  if (!_friendRequests.length) {
    container.style.display = 'none';
    var badge = document.getElementById('friends-requests-badge');
    if (badge) badge.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  var list = document.getElementById('friend-requests-list');
  if (!list) return;

  list.innerHTML = _friendRequests.map(function(r) {
    var initials = r.sender_name.substring(0, 2).toUpperCase();
    var avatarInner = r.sender_avatar
      ? '<img src="' + r.sender_avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.parentElement.textContent=\'' + initials + '\'">'
      : '<span style="font-size:14px;font-weight:700;color:white;">' + initials + '</span>';
    return '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">' +
      '<div onclick="openFullUserProfile(\'' + r.user_id + '\')" style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#4A90D9,#7B5EA7);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;cursor:pointer;">' + avatarInner + '</div>' +
      '<div style="flex:1;min-width:0;cursor:pointer;" onclick="openFullUserProfile(\'' + r.user_id + '\')">' +
      '<div style="font-weight:700;font-size:14px;">' + _escS(r.sender_name) + '</div>' +
      '<div style="font-size:12px;color:var(--text-secondary);">Хочет добавить вас</div></div>' +
      '<div style="display:flex;gap:6px;flex-shrink:0;">' +
      '<button onclick="event.stopPropagation();acceptFriend(\'' + r.id + '\',\'' + r.user_id + '\')" style="background:#34C759;color:white;border:none;border-radius:10px;padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">✓</button>' +
      '<button onclick="event.stopPropagation();declineFriend(\'' + r.id + '\')" style="background:rgba(239,68,68,0.08);color:#EF4444;border:1px solid rgba(239,68,68,0.15);border-radius:10px;padding:8px 12px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">✕</button>' +
      '</div></div>';
  }).join('');

  var badge = document.getElementById('friends-requests-badge');
  if (badge) {
    badge.textContent = _friendRequests.length;
    badge.style.display = _friendRequests.length ? 'flex' : 'none';
  }
}

// ════════════════════════════════════════════════════════════
// ПОЛНЫЙ ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ
// ════════════════════════════════════════════════════════════

async function openFullUserProfile(userId) {
  if (!userId || !supabaseClient) return;

  closeModal('m-user-profile');

  var body = document.getElementById('user-profile-body');
  if (!body) return;
  body.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-secondary);">Загружаем профиль...</div>';
  nav('userProfile');

  try {
    var results = await Promise.all([
      supabaseClient.from('profiles').select('*').eq('user_id', userId).single(),
      supabaseClient.from('pets').select('name, breed, photo_url, sex, age').eq('user_id', userId),
      supabaseClient.from('posts').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
      _getFriendStatus(userId)
    ]);

    var p = results[0].data || {};
    var petsList = results[1].data || [];
    var postsList = results[2].data || [];
    var friendStatus = results[3];

    var name = p.name || 'Пользователь';
    var initials = name.substring(0, 2).toUpperCase();
    var isSelf = currentUser && currentUser.id === userId;

    // FIX: добавляем посты в _feedPosts чтобы лайки/комменты работали через buildPostCard
    _profilePostsCache = postsList;
    postsList.forEach(function(post) {
      if (typeof _feedPosts !== 'undefined' && !_feedPosts.find(function(fp) { return fp.id === post.id; })) {
        _feedPosts.push(post);
      }
    });

    // Аватар
    var avatarHtml = p.avatar_url
      ? '<img src="' + p.avatar_url + '" style="width:88px;height:88px;border-radius:50%;object-fit:cover;border:3px solid rgba(255,255,255,0.4);box-shadow:0 4px 16px rgba(0,0,0,0.15);" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' +
        '<div style="display:none;width:88px;height:88px;border-radius:50%;background:rgba(255,255,255,0.15);align-items:center;justify-content:center;font-size:32px;font-weight:800;color:white;border:3px solid rgba(255,255,255,0.3);">' + initials + '</div>'
      : '<div style="width:88px;height:88px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:800;color:white;border:3px solid rgba(255,255,255,0.3);">' + initials + '</div>';

    // Кнопка дружбы / редактирования
    var safeId = userId.replace(/'/g, "\\'");
    var safeName = name.replace(/'/g, "\\'");
    var friendBtnHtml = '';
    if (isSelf) {
      friendBtnHtml = '<button class="btn btn-p" style="width:100%;font-size:13px;" onclick="nav(\'edit-profile\');loadProfileForm()">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" style="margin-right:6px;"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
        'Редактировать профиль</button>';
    } else {
      if (friendStatus === 'accepted') {
        friendBtnHtml = '<div id="friend-btn-' + userId + '" style="display:flex;gap:8px;width:100%;">' +
          '<button class="btn btn-p" style="flex:1;font-size:13px;" onclick="openChatWithUser(\'' + safeId + '\',\'' + safeName + '\',\'' + initials + '\',\'linear-gradient(135deg,#4A90D9,#7B5EA7)\')">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" style="margin-right:4px;"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>Написать</button>' +
          '<button class="btn" style="font-size:12px;background:rgba(239,68,68,0.08);color:#EF4444;border:1px solid rgba(239,68,68,0.15);" onclick="removeFriend(\'' + safeId + '\')">Удалить</button></div>';
      } else if (friendStatus === 'pending_sent') {
        friendBtnHtml = '<button id="friend-btn-' + userId + '" class="btn btn-g" style="width:100%;font-size:13px;opacity:0.7;" disabled>⏳ Запрос отправлен</button>';
      } else if (friendStatus === 'pending_received') {
        friendBtnHtml = '<div id="friend-btn-' + userId + '" style="display:flex;gap:8px;width:100%;">' +
          '<button class="btn" style="flex:1;font-size:13px;background:#34C759;color:white;border:none;font-family:inherit;" onclick="acceptFriendByUserId(\'' + safeId + '\')">✓ Принять запрос</button>' +
          '<button class="btn btn-g" style="font-size:13px;" onclick="declineFriendByUserId(\'' + safeId + '\')">Отклонить</button></div>';
      } else {
        friendBtnHtml = '<button id="friend-btn-' + userId + '" class="btn btn-p" style="width:100%;font-size:13px;" onclick="sendFriendRequest(\'' + userId + '\')">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" style="margin-right:6px;"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>' +
          'Добавить в друзья</button>';
      }
    }

    // Питомцы
    var petsHtml = '';
    if (petsList.length) {
      petsHtml = '<div style="background:var(--white);border-radius:16px;padding:16px;box-shadow:0 2px 12px rgba(0,0,0,0.06);margin-bottom:16px;">' +
        '<div style="font-size:14px;font-weight:800;margin-bottom:12px;">🐕 Питомцы</div>' +
        '<div style="display:flex;gap:12px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:4px;">' +
        petsList.map(function(pet) {
          var petAv = pet.photo_url
            ? '<img src="' + pet.photo_url + '" style="width:56px;height:56px;border-radius:50%;object-fit:cover;" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">'
            : '';
          var petFallback = '<div style="' + (pet.photo_url ? 'display:none;' : '') + 'width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#4A90D9,#7B5EA7);display:flex;align-items:center;justify-content:center;font-size:22px;">🐕</div>';
          return '<div style="text-align:center;flex-shrink:0;">' + petAv + petFallback +
            '<div style="font-size:12px;font-weight:700;margin-top:6px;max-width:64px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + _escS(pet.name) + ' ' + (pet.sex === 'ж' ? '♀' : '♂') + '</div>' +
            (pet.breed ? '<div style="font-size:10px;color:var(--text-secondary);max-width:64px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + _escS(pet.breed) + '</div>' : '') +
            '</div>';
        }).join('') +
        '</div></div>';
    }

    // Посты — загружаем лайки и рендерим
    var postsHtml = '';
    if (postsList.length) {
      var myLikes = new Set();
      if (currentUser && typeof getMyLikes === 'function') {
        myLikes = await getMyLikes(postsList.map(function(p2) { return p2.id; }));
      }
      postsHtml = '<div style="margin-bottom:16px;">' +
        '<div style="font-size:14px;font-weight:800;margin-bottom:12px;padding:0 4px;">📝 Публикации · ' + postsList.length + '</div>' +
        postsList.map(function(post) {
          return '<div id="feed-post-' + post.id + '">' + buildPostCard(post, myLikes.has(post.id)) + '</div>';
        }).join('') +
        '</div>';
    } else {
      postsHtml = '<div style="text-align:center;padding:30px 0;color:var(--text-secondary);">' +
        '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1.5" style="display:block;margin:0 auto 8px;"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>' +
        '<div style="font-size:13px;">Публикаций пока нет</div></div>';
    }

    // Count friends for stats
    var friendsCount = 0;
    try {
      var friendsResult = await supabaseClient
        .from('friends')
        .select('id')
        .or('user_id.eq.' + userId + ',friend_id.eq.' + userId)
        .eq('status', 'accepted');
      friendsCount = (friendsResult.data || []).length;
    } catch(e) {}

    body.innerHTML =
      // Gradient header
      '<div style="background:linear-gradient(145deg,var(--primary),#7B5EA7);padding:24px 20px 20px;text-align:center;border-radius:0 0 24px 24px;margin:-16px -20px 16px -20px;">' +
        '<div style="display:flex;justify-content:center;margin-bottom:12px;">' + avatarHtml + '</div>' +
        '<div style="font-size:20px;font-weight:900;color:white;font-family:\'Nunito\',sans-serif;margin-bottom:4px;">' + _escS(name) + '</div>' +
        (p.district ? '<div style="font-size:13px;color:rgba(255,255,255,0.8);display:flex;align-items:center;justify-content:center;gap:4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>' + _escS(p.district) + '</div>' : '') +
        // Stats bar
        '<div style="display:flex;gap:0;background:rgba(255,255,255,0.12);border-radius:14px;padding:12px;margin-top:14px;">' +
          '<div style="flex:1;text-align:center;' + (isSelf ? 'cursor:pointer;' : '') + '"' + (isSelf ? ' onclick="nav(\'myFriends\');if(typeof initSocial===\'function\')initSocial()"' : '') + '><div style="font-size:18px;font-weight:900;color:white;">' + friendsCount + '</div><div style="font-size:11px;color:rgba(255,255,255,0.7);">друзей</div></div>' +
          '<div style="width:1px;background:rgba(255,255,255,0.15);"></div>' +
          '<div style="flex:1;text-align:center;"><div style="font-size:18px;font-weight:900;color:white;">' + postsList.length + '</div><div style="font-size:11px;color:rgba(255,255,255,0.7);">постов</div></div>' +
          '<div style="width:1px;background:rgba(255,255,255,0.15);"></div>' +
          '<div style="flex:1;text-align:center;"><div style="font-size:18px;font-weight:900;color:white;">' + petsList.length + '</div><div style="font-size:11px;color:rgba(255,255,255,0.7);">питомцев</div></div>' +
        '</div>' +
      '</div>' +
      // Кнопка дружбы
      (friendBtnHtml ? '<div style="margin-bottom:16px;">' + friendBtnHtml + '</div>' : '') +
      // Питомцы
      petsHtml +
      // Посты
      postsHtml;

  } catch(e) {
    console.error('Open user profile error:', e);
    body.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-secondary);">Не удалось загрузить профиль</div>';
  }
}

// ════════════════════════════════════════════════════════════
// ХЕЛПЕРЫ
// ════════════════════════════════════════════════════════════

async function acceptFriendByUserId(userId) {
  if (!supabaseClient || !currentUser) return;
  try {
    var result = await supabaseClient
      .from('friends')
      .select('id')
      .eq('user_id', userId)
      .eq('friend_id', currentUser.id)
      .eq('status', 'pending')
      .single();
    if (result.data) await acceptFriend(result.data.id, userId);
  } catch(e) { showToast('Ошибка'); }
}

async function declineFriendByUserId(userId) {
  if (!supabaseClient || !currentUser) return;
  try {
    var result = await supabaseClient
      .from('friends')
      .select('id')
      .eq('user_id', userId)
      .eq('friend_id', currentUser.id)
      .eq('status', 'pending')
      .single();
    if (result.data) await declineFriend(result.data.id);
    _updateFriendBtnUI(userId, 'none');
  } catch(e) { showToast('Ошибка'); }
}

// Локальный escape — имя с _ чтобы не конфликтовать с escHtml из chat.js/app.js
function _escS(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ════════════════════════════════════════════════════════════
// ИНИЦИАЛИЗАЦИЯ
// ════════════════════════════════════════════════════════════

async function initSocial() {
  await Promise.all([loadMyFriends(), loadFriendRequests()]);
  renderFriendRequests();
  renderFriendsList();
  var badge = document.getElementById('friends-requests-badge');
  if (badge) {
    badge.textContent = _friendRequests.length;
    badge.style.display = _friendRequests.length ? 'flex' : 'none';
  }
}

window.sendFriendRequest = sendFriendRequest;
window.acceptFriend = acceptFriend;
window.declineFriend = declineFriend;
window.removeFriend = removeFriend;
window.acceptFriendByUserId = acceptFriendByUserId;
window.declineFriendByUserId = declineFriendByUserId;
window.openFullUserProfile = openFullUserProfile;
window.renderFriendsList = renderFriendsList;
window.renderFriendRequests = renderFriendRequests;
window.initSocial = initSocial;

// Автоинициализация после auth
(function() {
  function tryInit() {
    if (typeof supabaseClient !== 'undefined' && supabaseClient &&
        typeof currentUser !== 'undefined' && currentUser) {
      initSocial();
    } else {
      setTimeout(tryInit, 2000);
    }
  }
  setTimeout(tryInit, 3500);
})();
