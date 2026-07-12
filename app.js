"use strict";

const DATA_URL = "./contacts.json";
const state = { contacts: [], query: "", filters: {} };
const els = {
  contacts: document.querySelector("#contacts"), search: document.querySelector("#searchInput"),
  clear: document.querySelector("#clearSearch"), filters: document.querySelector("#filters"),
  count: document.querySelector("#resultCount"), status: document.querySelector("#dataStatus"),
  empty: document.querySelector("#emptyState"), emptyTitle: document.querySelector("#emptyTitle"),
  emptyText: document.querySelector("#emptyText"), reset: document.querySelector("#resetFilters"),
  toast: document.querySelector("#toast"), updated: document.querySelector("#updatedAt"),
  install: document.querySelector("#installButton")
};

const escapeHTML = value => String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);
const clean = value => String(value ?? "").trim();
const fold = value => clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();

function normalizeGreekPhone(original) {
  const raw = clean(original);
  if (!raw || /^(?:-|—|n\/?a|none)$/i.test(raw)) return { original: "", tel: "", whatsapp: "", valid: false };
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  if (digits.startsWith("30") && !digits.startsWith("+")) digits = `+${digits}`;
  if (/^0\d{10}$/.test(digits)) digits = `+30${digits.slice(1)}`;
  if (/^\d{10}$/.test(digits)) digits = `+30${digits}`;
  const valid = /^\+\d{8,15}$/.test(digits);
  const waDigits = valid ? digits.slice(1) : "";
  const whatsapp = /^3069\d{8}$/.test(waDigits) ? waDigits : "";
  return { original: raw, tel: valid ? digits : "", whatsapp, valid };
}

function deduplicate(rows) {
  const seen = new Set();
  return rows.filter(row => {
    if (!row || typeof row !== "object") return false;
    const meaningful = Object.values(row).some(value => clean(value));
    if (!meaningful) return false;
    const key = [row.station,row.company,row.airline,row.name,row.role,row.phone,row.email,row.category,row.notes].map(fold).join("|");
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}

function getFilterFields() {
  const candidates = [
    ["station","Station"], ["company","Company"], ["airline","Airline"],
    ["category","Category"], ["representativeType","Representative"]
  ];
  return candidates.filter(([key]) => new Set(state.contacts.map(row => clean(row[key])).filter(Boolean)).size > 1);
}

function createFilters() {
  els.filters.innerHTML = "";
  getFilterFields().forEach(([key,label]) => {
    const values = [...new Set(state.contacts.map(row => clean(row[key])).filter(Boolean))].sort((a,b) => a.localeCompare(b));
    const wrapper = document.createElement("div"); wrapper.className = "filter-field";
    wrapper.innerHTML = `<label for="filter-${key}">${label}</label><select id="filter-${key}" data-filter="${key}"><option value="">All ${escapeHTML(label.toLowerCase())}</option>${values.map(value => `<option value="${escapeHTML(value)}">${escapeHTML(value)}</option>`).join("")}</select>`;
    wrapper.querySelector("select").addEventListener("change", event => { state.filters[key] = event.target.value; render(); });
    els.filters.append(wrapper);
  });
}

function searchable(row) {
  return Object.values(row).filter(value => typeof value !== "object").map(fold).join(" ");
}

function filteredContacts() {
  const query = fold(state.query);
  return state.contacts.filter(row => (!query || searchable(row).includes(query)) && Object.entries(state.filters).every(([key,value]) => !value || clean(row[key]) === value));
}

function groupingField(rows) {
  const priority = ["station","category","airline","company","representativeType"];
  return priority.find(key => new Set(rows.map(row => clean(row[key])).filter(Boolean)).size > 1) || "category";
}

function detail(label, value, isEmail = false) {
  if (!clean(value)) return "";
  const safe = escapeHTML(value);
  return `<li class="detail"><span class="detail-label">${label}</span><span class="detail-value">${isEmail ? `<a href="mailto:${safe}">${safe}</a>` : safe}</span></li>`;
}

function card(row, index) {
  const phone = normalizeGreekPhone(row.phone);
  const title = clean(row.name) || clean(row.role) || clean(row.company) || "Operational contact";
  const company = clean(row.airline) || clean(row.company);
  const notes = clean(row.notes);
  const phonePanel = phone.original ? `<div class="phone-panel">
    ${phone.valid ? `<a class="phone-number" href="tel:${escapeHTML(phone.tel)}" aria-label="Call ${escapeHTML(phone.original)}">${escapeHTML(phone.original)}</a>` : `<span class="phone-number">${escapeHTML(phone.original)}</span>`}
    <div class="actions">
      ${phone.valid ? `<a class="action primary" href="tel:${escapeHTML(phone.tel)}">Call</a>` : `<button class="action primary" disabled title="Number format needs review">Call</button>`}
      <button class="action copy-button" type="button" data-phone="${escapeHTML(phone.original)}">Copy</button>
      ${phone.whatsapp ? `<a class="action whatsapp" href="https://wa.me/${phone.whatsapp}" target="_blank" rel="noopener">WhatsApp</a>` : ""}
    </div></div>` : "";
  return `<article class="contact-card" aria-labelledby="contact-${index}"><div class="card-body">
    <div class="card-top"><div><h3 id="contact-${index}" class="contact-name">${escapeHTML(title)}</h3>${company ? `<p class="company">${escapeHTML(company)}</p>` : ""}</div>${clean(row.category) ? `<span class="badge">${escapeHTML(row.category)}</span>` : ""}</div>
    <ul class="details">${detail("Role",row.role)}${detail("Station",row.station)}${detail("Rep.",row.representativeType)}${detail("Email",row.email,true)}</ul>
    ${phonePanel}${notes ? `<details class="notes"><summary>Additional notes</summary><p>${escapeHTML(notes)}</p></details>` : ""}
  </div></article>`;
}

function render() {
  const rows = filteredContacts();
  els.count.textContent = `${rows.length} ${rows.length === 1 ? "contact" : "contacts"}`;
  els.contacts.innerHTML = "";
  if (!rows.length) {
    els.empty.hidden = false;
    if (!state.contacts.length) { els.emptyTitle.textContent = "Contact data required"; els.emptyText.textContent = "Export the Google Sheet tab and run the included converter. See README.md for exact steps."; els.reset.hidden = true; }
    else { els.emptyTitle.textContent = "No contacts found"; els.emptyText.textContent = "Try changing your search or filters."; els.reset.hidden = false; }
    return;
  }
  els.empty.hidden = true;
  const groupKey = groupingField(rows);
  const groups = new Map();
  rows.forEach(row => {
    const key = clean(row[groupKey]) || "Other";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });
  [...groups.entries()].sort(([a],[b]) => a.localeCompare(b)).forEach(([name,contacts]) => {
    const section = document.createElement("section"); section.className = "group";
    section.innerHTML = `<h2 class="group-heading"><span>${escapeHTML(name)}</span><span class="group-count">${contacts.length}</span></h2><div class="contact-grid">${contacts.map(card).join("")}</div>`;
    els.contacts.append(section);
  });
}

let toastTimer;
function toast(message) { els.toast.textContent = message; els.toast.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => els.toast.classList.remove("show"), 1800); }

async function copyPhone(number) {
  try { await navigator.clipboard.writeText(number); }
  catch { const input = document.createElement("textarea"); input.value = number; input.setAttribute("readonly",""); input.style.position="fixed"; input.style.opacity="0"; document.body.append(input); input.select(); if (!document.execCommand("copy")) throw new Error("copy failed"); input.remove(); }
  toast("Number copied");
}

async function loadContacts() {
  try {
    const response = await fetch(DATA_URL, { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    state.contacts = deduplicate(Array.isArray(payload) ? payload : payload.contacts || []);
    if (payload.updatedAt) els.updated.textContent = `Contact data updated: ${payload.updatedAt}`;
    if (payload.sampleData || !state.contacts.length) { els.status.hidden = false; els.status.textContent = "Contact data not yet imported"; }
    createFilters(); render();
  } catch (error) {
    console.error("Contact data could not be loaded:", error);
    els.count.textContent = "Contact data unavailable"; els.empty.hidden = false; els.emptyTitle.textContent = "Contacts could not be loaded"; els.emptyText.textContent = "Check that data/contacts.json exists, then reload the page."; els.reset.hidden = true;
  }
}

els.search.addEventListener("input", event => { state.query = event.target.value; els.clear.hidden = !state.query; render(); });
els.clear.addEventListener("click", () => { els.search.value=""; state.query=""; els.clear.hidden=true; els.search.focus(); render(); });
els.reset.addEventListener("click", () => { state.query=""; state.filters={}; els.search.value=""; els.clear.hidden=true; els.filters.querySelectorAll("select").forEach(select => select.value=""); render(); });
els.contacts.addEventListener("click", event => { const button = event.target.closest(".copy-button"); if (button) copyPhone(button.dataset.phone).catch(() => toast("Could not copy number")); });

let installPrompt;
window.addEventListener("beforeinstallprompt", event => { event.preventDefault(); installPrompt=event; els.install.hidden=false; });
els.install.addEventListener("click", async () => { if (!installPrompt) return; await installPrompt.prompt(); installPrompt=null; els.install.hidden=true; });
window.addEventListener("appinstalled", () => { els.install.hidden=true; toast("App installed"); });

if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(error => console.warn("Offline mode unavailable", error)));
loadContacts();
