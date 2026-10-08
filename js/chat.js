// Chat privado global de RPM Rosario.
(function inicializarChatPrivado() {
  if (typeof supabaseClient === 'undefined') return;

  const iconoMensaje = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.7 8.7 0 0 1-3.7-.8L4 19l1.2-3.2A7.4 7.4 0 0 1 4 11.5 7.5 7.5 0 0 1 12 4a7.5 7.5 0 0 1 8 7.5Z"/><path d="M8 11.5h.01M12 11.5h.01M16 11.5h.01" stroke-linecap="round"/></svg>';
  const root = document.createElement('div');
  root.innerHTML = `
    <button class="chat-launcher" id="chatLauncher" type="button" aria-label="Abrir mensajes privados" aria-expanded="false">
      ${iconoMensaje}<span class="chat-launcher-badge" id="chatBadge" hidden>0</span>
    </button>
    <section class="chat-panel" id="chatPanel" aria-label="Mensajes privados" aria-hidden="true">
      <div class="chat-head"><h2>MENSAJES</h2><button class="chat-close" id="chatClose" type="button" aria-label="Cerrar mensajes">×</button></div>
      <div class="chat-view" id="chatView">
        <div class="chat-search-wrap"><input class="chat-search" id="chatSearch" type="search" placeholder="Buscar un usuario..." aria-label="Buscar un usuario"></div>
        <div class="chat-users" id="chatUsers"><p class="chat-status">Iniciá sesión para enviar mensajes privados.</p></div>
      </div>
    </section>`;
  document.body.append(root);

  const launcher = root.querySelector('#chatLauncher');
  const panel = root.querySelector('#chatPanel');
  const close = root.querySelector('#chatClose');
  const view = root.querySelector('#chatView');
  let users = root.querySelector('#chatUsers');
  let search = root.querySelector('#chatSearch');
  const badge = root.querySelector('#chatBadge');
  let session = null;
  let profiles = [];
  let selectedUser = null;
  let realtimeChannel = null;

  const escapeHtml = value => String(value || '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
  const displayName = profile => profile.display_name?.trim() || profile.email || 'Usuario RPM';
  const initials = name => name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  const formatDate = value => new Date(value).toLocaleString('es-AR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });

  function showPanel(open) {
    panel.classList.toggle('is-open', open);
    panel.setAttribute('aria-hidden', String(!open));
    launcher.setAttribute('aria-expanded', String(open));
    if (open && session) search.focus();
  }

  function renderAvatar(profile, className = 'chat-avatar') {
    const name = displayName(profile);
    return profile.avatar_data
      ? `<img class="${className}" src="${escapeHtml(profile.avatar_data)}" alt="">`
      : `<span class="${className}">${escapeHtml(initials(name))}</span>`;
  }

  function renderUsers() {
    const term = search.value.trim().toLowerCase();
    const matches = profiles.filter(profile => displayName(profile).toLowerCase().includes(term));
    if (!matches.length) {
      users.innerHTML = '<p class="chat-status">No encontramos usuarios con ese nombre.</p>';
      return;
    }
    users.innerHTML = matches.map(profile => `
      <button class="chat-user" type="button" data-user-id="${profile.id}">
        ${renderAvatar(profile)}<span><span class="chat-user-name">${escapeHtml(displayName(profile))}</span><span class="chat-user-type">${profile.account_type === 'concesionaria' ? 'CONCESIONARIA' : 'PARTICULAR'}</span></span>
      </button>`).join('');
    users.querySelectorAll('[data-user-id]').forEach(button => button.addEventListener('click', () => {
      selectedUser = profiles.find(profile => profile.id === button.dataset.userId);
      if (selectedUser) openConversation();
    }));
  }

  async function loadProfiles() {
    const { data, error } = await supabaseClient.from('public_profiles').select('id, display_name, avatar_data, account_type, email').neq('id', session.user.id).order('display_name');
    if (error) {
      users.innerHTML = '<p class="chat-status">No se pudieron cargar los usuarios. Revisá la migración de mensajes.</p>';
      return;
    }
    profiles = data || [];
    renderUsers();
  }

  function renderConversation(messages) {
    const messagesBox = view.querySelector('#chatMessages');
    messagesBox.innerHTML = messages.length ? messages.map(message => `
      <article class="chat-message ${message.sender_id === session.user.id ? 'mine' : 'theirs'}">
        <p>${escapeHtml(message.content)}</p><small>${formatDate(message.created_at)}</small>
      </article>`).join('') : '<p class="chat-status">Todavía no hay mensajes. Escribí el primero.</p>';
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  async function loadMessages() {
    const { data, error } = await supabaseClient.from('private_messages').select('id, sender_id, recipient_id, content, created_at').or(`and(sender_id.eq.${session.user.id},recipient_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},recipient_id.eq.${session.user.id})`).order('created_at');
    if (error) {
      view.querySelector('#chatMessages').innerHTML = '<p class="chat-status">No se pudo cargar esta conversación.</p>';
      return;
    }
    renderConversation(data || []);
  }

  function subscribeToConversation() {
    if (realtimeChannel) supabaseClient.removeChannel(realtimeChannel);
    realtimeChannel = supabaseClient.channel(`private-chat-${session.user.id}-${selectedUser.id}`).on('postgres_changes', { event:'INSERT', schema:'public', table:'private_messages' }, payload => {
      const message = payload.new;
      if ((message.sender_id === session.user.id && message.recipient_id === selectedUser.id) || (message.sender_id === selectedUser.id && message.recipient_id === session.user.id)) loadMessages();
    }).subscribe();
  }

  function openConversation() {
    view.innerHTML = `
      <div class="chat-conversation">
        <div class="chat-conversation-head"><button class="chat-back" id="chatBack" type="button" aria-label="Volver a usuarios">‹</button>${renderAvatar(selectedUser)}<strong>${escapeHtml(displayName(selectedUser))}</strong></div>
        <div class="chat-messages" id="chatMessages"><p class="chat-status">Cargando conversación...</p></div>
        <form class="chat-compose" id="chatCompose"><textarea id="chatInput" maxlength="2000" placeholder="Escribí un mensaje..." aria-label="Mensaje" required></textarea><button type="submit" aria-label="Enviar mensaje">➤</button></form>
      </div>`;
    view.querySelector('#chatBack').addEventListener('click', () => {
      selectedUser = null;
      view.innerHTML = '<div class="chat-search-wrap"><input class="chat-search" id="chatSearch" type="search" placeholder="Buscar un usuario..." aria-label="Buscar un usuario"></div><div class="chat-users" id="chatUsers"></div>';
      search = view.querySelector('#chatSearch');
      users = view.querySelector('#chatUsers');
      search.addEventListener('input', renderUsers);
      profiles.length ? renderUsers() : loadProfiles();
    });
    view.querySelector('#chatCompose').addEventListener('submit', sendMessage);
    loadMessages();
    subscribeToConversation();
  }

  async function sendMessage(event) {
    event.preventDefault();
    const input = view.querySelector('#chatInput');
    const content = input.value.trim();
    if (!content) return;
    const button = event.submitter;
    button.disabled = true;
    const { error } = await supabaseClient.from('private_messages').insert({ sender_id: session.user.id, recipient_id: selectedUser.id, content });
    button.disabled = false;
    if (error) return;
    input.value = '';
    await loadMessages();
  }

  launcher.addEventListener('click', () => showPanel(!panel.classList.contains('is-open')));
  close.addEventListener('click', () => showPanel(false));
  search.addEventListener('input', renderUsers);

  (async function start() {
    const result = await supabaseClient.auth.getSession();
    session = result.data.session;
    if (session) await loadProfiles();
  })();
})();
