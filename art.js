(() => {
  "use strict";

  const game = typeof GAME_MANAGER === "undefined" ? null : GAME_MANAGER.instance;
  const images = typeof IMAGE_PROCESSING === "undefined" ? null : IMAGE_PROCESSING;
  const inventory = typeof MENU === "undefined" ? null : MENU.Inventory;
  const methods = ["getItemImage", "getWornItemImage"];
  if (!game || !inventory || methods.some(name => typeof images?.[name] !== "function")) {
    throw new Error("Open a loaded Battle Mages game tab first.");
  }
  if (window.bmrEquipmentArt) {
    window.bmrEquipmentArt.open();
    return;
  }

  const slots = {
    head: "Head",
    shirt: "Shirt",
    pants: "Pants",
    shoes: "Shoes",
    undershirt: "Undershirt",
    underpants: "Underpants",
    gloves: "Gloves",
    bra: "Bra",
  };
  const slotNames = Object.keys(slots);
  const storageKey = "bmr.equipment-art.v1";
  const oldShortsUrl = "www.bluebella.com/cdn/shop/files/42469_05_360x.jpg";
  const itemId = slot => game.GetItemIdBySlot(slot);
  const itemIn = slot => {
    const id = itemId(slot);
    return id ? game.GetItem(id) : null;
  };
  const httpsImage = value => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
    } catch {
      return "";
    }
  };

  const existing = {};
  for (const slot of slotNames) {
    const item = itemIn(slot);
    const url = item && images.getWornItemImage(item);
    if (typeof url === "string" && httpsImage(url) && new URL(url).origin !== location.origin) {
      existing[slot] = url;
    }
  }
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(storageKey));
  } catch {
    // The controls also work for the current page when storage is unavailable.
  }
  const artwork = Object.create(null);
  for (const slot of slotNames) {
    const url = httpsImage((saved ?? existing)[slot]);
    if (url) artwork[slot] = url;
  }

  // Retire the previous session's outfit overlay before taking the originals.
  window.bmrPinkOutfitReset?.();
  const original = {};
  const hooks = {};
  for (const name of methods) {
    const active = images[name];
    original[name] = typeof active.o === "function" && String(active).includes(oldShortsUrl)
      ? active.o : active;
    hooks[name] = function (item, ...args) {
      const slot = item?.id == null ? undefined : slotNames.find(key => String(itemId(key)) === String(item.id));
      return (slot && artwork[slot]) || original[name].call(this, item, ...args);
    };
    images[name] = hooks[name];
  }

  const host = document.createElement("div");
  Object.assign(host.style, { position: "fixed", right: "16px", bottom: "16px", zIndex: "1000000" });
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = [
    '<style>',
    ':host{font:14px/1.4 system-ui;color:#faeaf2}*{box-sizing:border-box}button,select,input{font:inherit}',
    'button{cursor:pointer;background:#492139;border:1px solid #a44b77;color:#fff;border-radius:6px;padding:7px 10px}',
    'button:hover{background:#642a4a}button:disabled{opacity:.55;cursor:default}button:focus-visible,select:focus-visible,input:focus-visible{outline:2px solid #ff9cc7;outline-offset:2px}',
    '#launch{background:#741c4b;box-shadow:0 2px 12px #0008}section{width:min(335px,calc(100vw - 32px));max-height:calc(100vh - 78px);overflow:auto;margin-bottom:8px;background:#221622;border:1px solid #ad597f;border-radius:11px;padding:13px;box-shadow:0 8px 25px #0009}',
    'header,.actions{display:flex;align-items:center;justify-content:space-between;gap:8px}h2{font-size:17px;margin:0}label{display:block;margin-top:9px}',
    'select,input{display:block;width:100%;margin-top:4px;padding:6px 7px;border:1px solid #a46f89;border-radius:5px;background:#362536;color:#fff}',
    '.sample{display:flex;align-items:center;gap:9px;margin:9px 0;color:#eed1e0}.sample img{width:50px;height:50px;object-fit:contain;background:#140e16;border-radius:5px}.sample img[hidden],[hidden]{display:none!important}',
    '.actions{margin-top:10px;justify-content:flex-start}#status{min-height:1.4em;color:#f0c7dc;margin:7px 0 0;overflow-wrap:anywhere}',
    '</style>',
    '<section id="panel" aria-labelledby="heading" hidden><header><h2 id="heading">Equipment Art</h2><button id="close" aria-label="Close equipment art">×</button></header>',
    '<label for="slot">Equipment slot</label><select id="slot"></select>',
    '<div class="sample"><img id="preview" alt=""><span id="item"></span></div>',
    '<label for="url">Direct HTTPS image link</label><input id="url" type="url" autocomplete="off" placeholder="https://…">',
    '<div class="actions"><button id="apply">Apply image</button><button id="reset">Reset slot</button></div>',
    '<p id="status" role="status"></p></section><button id="launch" aria-expanded="false" aria-controls="panel">Equipment Art</button>',
  ].join("");
  document.body.append(host);

  const el = id => root.getElementById(id);
  const select = el("slot");
  const field = el("url");
  const preview = el("preview");
  const apply = el("apply");
  const reset = el("reset");
  const status = el("status");
  let attempt = 0;
  const iconFor = slot => document.querySelector(".equipment .item_slot.accessory." + slot)?.firstElementChild;
  const showIcon = slot => {
    const icon = iconFor(slot);
    const item = itemIn(slot);
    if (!icon || !item) return;
    const url = artwork[slot] || original.getWornItemImage.call(images, item);
    if (typeof url === "string" && url) icon.style.backgroundImage = "url(" + JSON.stringify(url) + ")";
  };
  const redraw = () => {
    if (inventory.menu) inventory.Redraw();
    slotNames.forEach(showIcon);
  };
  const save = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(artwork));
      return true;
    } catch {
      return false;
    }
  };
  const render = () => {
    const selected = select.value || "head";
    select.replaceChildren();
    for (const slot of slotNames) {
      const item = itemIn(slot);
      const option = document.createElement("option");
      option.value = slot;
      option.textContent = slots[slot] + (artwork[slot] ? " • custom" : "") + (item ? "" : " · empty");
      select.append(option);
    }
    select.value = selected;
    const item = itemIn(selected);
    const url = item && images.getWornItemImage(item);
    preview.hidden = !url;
    if (url) preview.src = url;
    else preview.removeAttribute("src");
    el("item").textContent = item?.base?.item_name ?? "No item equipped";
    field.value = artwork[selected] || "";
    apply.disabled = !item;
    reset.disabled = !artwork[selected];
  };
  const open = () => {
    el("panel").hidden = false;
    el("launch").setAttribute("aria-expanded", "true");
    render();
  };
  const close = () => {
    el("panel").hidden = true;
    el("launch").setAttribute("aria-expanded", "false");
  };
  el("launch").onclick = () => el("panel").hidden ? open() : close();
  el("close").onclick = close;
  select.onchange = () => {
    attempt++;
    status.textContent = "";
    render();
  };
  field.onkeydown = event => {
    if (event.key === "Enter") {
      event.preventDefault();
      apply.click();
    }
  };
  apply.onclick = () => {
    const slot = select.value;
    const url = httpsImage(field.value.trim());
    if (!url || !itemIn(slot)) {
      status.textContent = "Choose an equipped slot and paste a valid HTTPS link.";
      return;
    }
    const ticket = ++attempt;
    const test = new Image();
    status.textContent = "Checking the image…";
    test.onload = () => {
      if (ticket !== attempt) return;
      artwork[slot] = url;
      const stored = save();
      redraw();
      render();
      status.textContent = slots[slot] + (stored ? " image saved." : " image applied for this page only.");
    };
    test.onerror = () => {
      if (ticket === attempt) status.textContent = "The link did not load an image. Try the direct image URL.";
    };
    test.src = url;
  };
  reset.onclick = () => {
    attempt++;
    const slot = select.value;
    delete artwork[slot];
    const stored = save();
    redraw();
    render();
    status.textContent = slots[slot] + (stored ? " restored to its original artwork." : " restored for this page only.");
  };

  window.bmrEquipmentArt = { open };
  if (saved === null && Object.keys(artwork).length) save();
  redraw();
  open();
})();
