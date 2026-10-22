const STORAGE_KEY = "storymate_chat_v1";
const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("messageInput");
const form = document.getElementById("chatForm");
const sendBtn = document.getElementById("sendBtn");
const welcome = document.getElementById("welcome");
const toast = document.getElementById("toast");
const sidebar = document.getElementById("sidebar");

let messages = [];
let busy = false;

function notify(text) {
  toast.textContent = text;
  toast.style.display = "block";
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.style.display = "none", 2600);
}
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); }
  catch { notify("Could not save this chat in browser storage."); }
}
function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (Array.isArray(data)) messages = data.filter(m =>
      m && ["user", "assistant"].includes(m.role) && typeof m.content === "string"
    ).slice(-80);
  } catch { messages = []; }
}
function addMessage(role, content, extraClass = "") {
  if (welcome) welcome.style.display = "none";
  const row = document.createElement("div");
  row.className = `message-row ${role === "user" ? "user" : "assistant"} ${extraClass}`;
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "user" ? "Y" : "✦";
  const body = document.createElement("div");
  body.className = "message-body";
  body.textContent = content; // textContent avoids rendering AI text as HTML
  row.append(avatar, body);
  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return row;
}
function render() {
  messagesEl.innerHTML = "";
  if (!messages.length) {
    if (welcome) { welcome.style.display = "block"; messagesEl.appendChild(welcome); }
    return;
  }
  if (welcome) welcome.style.display = "none";
  messages.forEach(m => addMessage(m.role, m.content));
}
function resizeInput() {
  inputEl.style.height = "auto";
  inputEl.style.height = Math.min(inputEl.scrollHeight, 180) + "px";
}
async function sendMessage(text) {
  text = text.trim();
  if (!text || busy) return;
  if (text.length > 8000) { notify("Please keep each message under 8,000 characters."); return; }

  messages.push({role:"user", content:text});
  messages = messages.slice(-80);
  save();
  render();
  inputEl.value = "";
  resizeInput();
  busy = true;
  sendBtn.disabled = true;
  const typing = addMessage("assistant", "Thinking…", "typing");

  try {
    // Send recent conversation context so the model can keep story details consistent.
    const response = await fetch("/api/chat", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({messages:messages.slice(-20)})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "The request failed.");
    typing.remove();
    messages.push({role:"assistant", content:data.reply});
    messages = messages.slice(-80);
    save();
    render();
  } catch (err) {
    typing.remove();
    addMessage("assistant", "Sorry — " + (err.message || "something went wrong."));
  } finally {
    busy = false;
    sendBtn.disabled = false;
    inputEl.focus();
  }
}
form.addEventListener("submit", e => {
  e.preventDefault();
  sendMessage(inputEl.value);
});
inputEl.addEventListener("input", resizeInput);
inputEl.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});
document.querySelectorAll("[data-prompt]").forEach(btn => {
  btn.addEventListener("click", () => {
    sidebar.classList.remove("open");
    sendMessage(btn.dataset.prompt);
  });
});
document.getElementById("newChat").addEventListener("click", () => {
  if (busy) return notify("Wait for the current reply to finish.");
  messages = [];
  save();
  render();
  sidebar.classList.remove("open");
  inputEl.focus();
});
document.getElementById("clearChat").addEventListener("click", () => {
  if (busy) return notify("Wait for the current reply to finish.");
  messages = [];
  save();
  render();
  notify("Current chat cleared.");
});
document.getElementById("mobileMenu").addEventListener("click", () => sidebar.classList.toggle("open"));
document.getElementById("exportChat").addEventListener("click", () => {
  if (!messages.length) return notify("There is no chat to download yet.");
  const text = messages.map(m => `${m.role === "user" ? "You" : "StoryMate"}:\n${m.content}`).join("\n\n---\n\n");
  const blob = new Blob([text], {type:"text/plain;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "storymate-chat.txt";
  a.click();
  URL.revokeObjectURL(url);
});
load();
render();
