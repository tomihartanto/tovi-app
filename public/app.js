const $ = (id) => document.getElementById(id);

const chatArea = $("chatArea");
const messagesContainer = $("messages");
const welcomeScreen = $("welcomeScreen");
const chatForm = $("chatForm");
const messageInput = $("messageInput");
const sendBtn = $("sendBtn");
const newChatBtn = $("newChatBtn");
const scrollBtn = $("scrollBtn");
const sidebarToggle = $("sidebarToggle");
const sidebar = $("sidebar");
const sidebarClose = $("sidebarClose");
const historyList = $("historyList");
const clearAllHistory = $("clearAllHistory");
const suggestionsContainer = $("suggestions");
const tempFill = $("tempFill");
const tempDot = $("tempDot");
const themeToggle = $("themeToggle");

let conversation = [];
let isLoading = false;
let abortController = null;
let currentChatId = null;

const STORAGE_KEY = "tovi_chats";
const THEME_KEY = "tovi_theme";
const MSG_ERROR = "Failed to get response from server.";
const MSG_NO_RESULT = "Sorry, no response received.";

const SUGGESTIONS = [
  { icon: "🏝️", text: "Rekomendasikan destinasi wisata tersembunyi di Indonesia" },
  { icon: "✈️", text: "Buatkan itinerary 3 hari di Bali untuk wisatawan budget" },
  { icon: "💴", text: "Tips hemat liburan ke Jepang untuk pertama kali" },
  { icon: "🍜", text: "Rekomendasi kuliner lokal wajib coba di Yogyakarta" },
  { icon: "🎒", text: "Persiapan apa saja untuk backpacker ke Eropa 2 minggu?" },
  { icon: "🏨", text: "Rekomendasi hotel murah tapi bagus di Kuala Lumpur" },
  { icon: "🚂", text: "Rute kereta api paling indah di dunia untuk wisata" },
  { icon: "🌺", text: "Destinasi terbaik untuk honeymoon di Asia Tenggara" },
  { icon: "📸", text: "Spot foto instagramable di Bandung dan sekitarnya" },
  { icon: "🗺️", text: "Panduan wisata 5 hari ke Thailand untuk pemula" },
  { icon: "🏖️", text: "Pantai terindah di Lombok yang belum ramai turis" },
  { icon: "🎭", text: "Festival budaya terbaik di Indonesia yang wajib dikunjungi" },
  { icon: "🏔️", text: "Tips mendaki Gunung Rinjani untuk pemula" },
  { icon: "🛍️", text: "Tempat belanja souvenir termurah di Bangkok" },
  { icon: "🌅", text: "Lokasi terbaik nonton sunrise di Indonesia" },
  { icon: "🛂", text: "Negara yang bebas visa untuk paspor Indonesia 2026" },
];

const AVATARS = {
  user:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  assistant:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>',
};
const SVG_SEND =
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12h14M12 5l7 7-7 7"/></svg>';
const SVG_COPY =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
const SVG_CHECK =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

function getTime() {
  return new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function renderMarkdown(text) {
  const escapeMap = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
  const escaped = text.replace(/[&<>"]/g, (c) => escapeMap[c]);

  return escaped
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^\* (.+)$/gm, "<li>$1</li>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/^(\d+)\. (.+)$/gm, "<li>$2</li>")
    .replace(/(<li>[\s\S]*?<\/li>)/g, (m) => `<ul>${m}</ul>`)
    .replace(/<\/ul>\s*<ul>/g, "")
    .replace(/\n{2,}/g, "<br><br>")
    .replace(/\n/g, "<br>");
}

function loadChats() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveChats(chats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
}

function saveCurrentChat() {
  if (conversation.length === 0) return;

  const chats = loadChats();
  const firstMsg = conversation.find((m) => m.role === "user")?.text || "Chat baru";

  if (currentChatId) {
    const idx = chats.findIndex((c) => c.id === currentChatId);
    if (idx !== -1) {
      chats[idx].conversation = conversation;
      chats[idx].preview = firstMsg.substring(0, 50);
      chats[idx].updatedAt = Date.now();
    } else {
      chats.unshift({
        id: currentChatId,
        preview: firstMsg.substring(0, 50),
        conversation,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  } else {
    const chat = {
      id: Date.now().toString(),
      preview: firstMsg.substring(0, 50),
      conversation,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    currentChatId = chat.id;
    chats.unshift(chat);
  }

  saveChats(chats);
  renderHistory();
}

function renderHistory() {
  const chats = loadChats();
  historyList.innerHTML = "";
  clearAllHistory.classList.toggle("hidden", chats.length === 0);

  chats.forEach((chat) => {
    const item = document.createElement("div");
    item.className = `history-item${chat.id === currentChatId ? " active" : ""}`;

    const info = document.createElement("div");
    info.className = "history-info";

    const preview = document.createElement("div");
    preview.className = "history-preview";
    preview.textContent = chat.preview;

    const date = document.createElement("div");
    date.className = "history-date";
    date.textContent = new Date(chat.updatedAt).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "history-delete";
    deleteBtn.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>';
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      saveChats(loadChats().filter((c) => c.id !== chat.id));
      if (chat.id === currentChatId) resetChat();
      renderHistory();
    });

    info.append(preview, date);
    item.append(info, deleteBtn);
    item.addEventListener("click", () => loadChat(chat.id));
    historyList.appendChild(item);
  });
}

function loadChat(chatId) {
  const chat = loadChats().find((c) => c.id === chatId);
  if (!chat) return;

  currentChatId = chat.id;
  conversation = chat.conversation;

  messagesContainer.innerHTML = "";
  showMessages();

  conversation.forEach((m) => {
    messagesContainer.appendChild(createMessageEl(m.role === "model" ? "assistant" : "user", m.text));
  });

  scrollToBottom();
  renderHistory();
  closeSidebar();
}

function renderSuggestions() {
  const shuffled = [...SUGGESTIONS].sort(() => Math.random() - 0.5);

  suggestionsContainer.innerHTML = "";
  shuffled.slice(0, 4).forEach((s) => {
    const btn = document.createElement("button");
    btn.className = "suggestion-btn";
    btn.innerHTML = `<span class="suggestion-icon">${s.icon}</span>${s.text}`;
    btn.addEventListener("click", () => sendMessage(s.text));
    suggestionsContainer.appendChild(btn);
  });
}

function resetChat() {
  if (abortController) abortController.abort();
  currentChatId = null;
  conversation = [];
  messagesContainer.innerHTML = "";
  messagesContainer.classList.add("hidden");
  welcomeScreen.classList.remove("hidden");
  newChatBtn.classList.add("hidden");
  isLoading = false;
  updateSendBtn();
  renderSuggestions();
}

function openSidebar() {
  sidebar.classList.remove("hidden");
  renderHistory();
}

function closeSidebar() {
  sidebar.classList.add("hidden");
}

function createMessageEl(role, content) {
  const div = document.createElement("div");
  div.className = `message ${role}`;

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.innerHTML = AVATARS[role];

  const body = document.createElement("div");
  body.className = "message-body";

  const wrapper = document.createElement("div");
  wrapper.className = "message-wrapper";

  const bubble = document.createElement("div");
  bubble.className = "message-content";
  if (role === "assistant") {
    bubble.innerHTML = renderMarkdown(content);
  } else {
    bubble.textContent = content;
  }

  wrapper.appendChild(bubble);

  if (role === "assistant") {
    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.innerHTML = SVG_COPY;
    copyBtn.title = "Salin";
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(content);
      copyBtn.innerHTML = SVG_CHECK;
      copyBtn.classList.add("copied");
      setTimeout(() => {
        copyBtn.innerHTML = SVG_COPY;
        copyBtn.classList.remove("copied");
      }, 2000);
    });
    wrapper.appendChild(copyBtn);
  }

  const time = document.createElement("div");
  time.className = "message-time";
  time.textContent = getTime();

  body.append(wrapper, time);
  div.append(avatar, body);
  return div;
}

function createThinkingEl() {
  const div = document.createElement("div");
  div.className = "message assistant";
  div.id = "thinking";

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.innerHTML = AVATARS.assistant;

  const body = document.createElement("div");
  body.className = "message-body";

  const bubble = document.createElement("div");
  bubble.className = "message-content";
  bubble.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';

  const time = document.createElement("div");
  time.className = "message-time";
  time.textContent = getTime();

  body.append(bubble, time);
  div.append(avatar, body);
  return div;
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    chatArea.scrollTop = chatArea.scrollHeight;
  });
}

function checkScroll() {
  const { scrollTop, scrollHeight, clientHeight } = chatArea;
  scrollBtn.classList.toggle("hidden", scrollHeight - scrollTop - clientHeight <= 100);
}

function showMessages() {
  welcomeScreen.classList.add("hidden");
  messagesContainer.classList.remove("hidden");
  newChatBtn.classList.remove("hidden");
}

function updateSendBtn() {
  if (isLoading) {
    sendBtn.innerHTML = '<div class="spinner"></div>';
    sendBtn.disabled = true;
  } else {
    sendBtn.innerHTML = SVG_SEND;
    sendBtn.disabled = !messageInput.value.trim();
  }
}

function autoResize() {
  messageInput.style.height = "auto";
  messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + "px";
}

function updateTempBar(temperature) {
  const percent = Math.round((temperature / 2) * 100);
  tempFill.style.width = percent + "%";
  tempDot.style.left = percent + "%";
}

function appendBotError(msg) {
  const div = document.createElement("div");
  div.className = "message assistant error-msg";

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.innerHTML = AVATARS.assistant;

  const body = document.createElement("div");
  body.className = "message-body";

  const bubble = document.createElement("div");
  bubble.className = "message-content";
  bubble.textContent = msg || MSG_ERROR;

  const retryBtn = document.createElement("button");
  retryBtn.className = "retry-btn";
  retryBtn.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg> Coba Lagi';
  retryBtn.addEventListener("click", () => {
    div.remove();
    fetchResponse();
  });

  const time = document.createElement("div");
  time.className = "message-time";
  time.textContent = getTime();

  body.append(bubble, retryBtn, time);
  div.append(avatar, body);
  messagesContainer.appendChild(div);
}

async function fetchResponse() {
  const thinkingEl = createThinkingEl();
  messagesContainer.appendChild(thinkingEl);
  scrollToBottom();

  isLoading = true;
  abortController = new AbortController();
  updateSendBtn();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation }),
      signal: abortController.signal,
    });

    thinkingEl.remove();

    if (!response.ok) {
      let errorMsg = MSG_ERROR;
      try { const e = await response.json(); if (e.error) errorMsg = e.error; } catch {}
      appendBotError(errorMsg);
      saveCurrentChat();
      return;
    }

    const data = await response.json();
    const resultText = data.result || MSG_NO_RESULT;
    if (data.temperature) updateTempBar(data.temperature);

    messagesContainer.appendChild(createMessageEl("assistant", resultText));
    conversation.push({ role: "model", text: resultText });
    saveCurrentChat();
  } catch (err) {
    if (err.name === "AbortError") return;
    thinkingEl.remove();
    appendBotError();
    saveCurrentChat();
  } finally {
    isLoading = false;
    abortController = null;
    updateSendBtn();
    scrollToBottom();
  }
}

async function sendMessage(text) {
  const trimmed = text.trim();
  if (!trimmed || isLoading) return;

  showMessages();
  conversation.push({ role: "user", text: trimmed });
  messagesContainer.appendChild(createMessageEl("user", trimmed));

  messageInput.value = "";
  messageInput.style.height = "auto";
  autoResize();

  await fetchResponse();
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) document.documentElement.setAttribute("data-theme", saved);
}

sidebarToggle.addEventListener("click", openSidebar);
sidebarClose.addEventListener("click", closeSidebar);

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  sendMessage(messageInput.value);
});

messageInput.addEventListener("input", () => {
  autoResize();
  updateSendBtn();
});

messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage(messageInput.value);
  }
});

newChatBtn.addEventListener("click", resetChat);

clearAllHistory.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  resetChat();
  renderHistory();
});

scrollBtn.addEventListener("click", scrollToBottom);
chatArea.addEventListener("scroll", checkScroll);

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next =
    current === "dark" ? "light"
    : current === "light" ? "dark"
    : window.matchMedia("(prefers-color-scheme: dark)").matches ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem(THEME_KEY, next);
});

initTheme();
updateTempBar(0.8);
renderSuggestions();
renderHistory();
