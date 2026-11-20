(() => {
  "use strict";


  if (window.bmrMageTools) {
    window.bmrMageTools.open();
    return;
  }

  const host = document.createElement("div");
  host.id = "bmr-mage-tools";
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = "\n<style>\n:host{position:fixed;top:12px;left:26%;z-index:1000000;width:min(340px,calc(100vw - 24px));font:14px/1.4 system-ui,sans-serif;color:#f3ecdc}\n*,*::before,*::after{box-sizing:border-box}[hidden]{display:none!important}button,input,select{font:inherit;color:inherit}\nbutton{cursor:pointer;background:#272a29;border:1px solid #625846;border-radius:5px;padding:7px 10px}button:hover{background:#393b32}button:disabled{opacity:.5;cursor:default}button[aria-pressed=true]{border-color:#ebc578;background:#473b27;color:#ffdf9c}button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid #ebc578;outline-offset:2px}\n#launch{display:inline-flex;align-items:center;gap:18px;background:#202320;color:#ffdf9c;font-size:16px;font-weight:750;box-shadow:0 3px 12px #0007}\n#launch span{font-size:11px}#tools,section{margin-top:5px;background:#1b1d1c;border:1px solid #625846;border-radius:7px;box-shadow:0 6px 18px #0008}\n#tools{width:max-content;max-width:100%;min-width:185px;padding:4px}#tools button{display:flex;justify-content:space-between;gap:20px;width:100%;border-color:transparent;text-align:left}\nsection{max-height:calc(100dvh - 110px);overflow:auto;padding:13px}header,.actions{display:flex;align-items:center;gap:8px}header{justify-content:space-between;margin-bottom:8px}h2{font-size:16px;margin:0;color:#ffdf9c}\nlabel{display:block;margin-top:9px}select,input{display:block;width:100%;margin-top:4px;padding:6px 7px;border:1px solid #625846;border-radius:5px;background:#292c28}\n.sample{display:flex;align-items:center;gap:9px;margin:9px 0;color:#e0d6c3}.sample img{width:48px;height:48px;object-fit:contain;background:#111312;border-radius:4px}\n.actions{margin-top:10px}[role=status]{min-height:1.4em;color:#e5ca94;margin:7px 0 0;overflow-wrap:anywhere}\n@media(max-width:620px){:host{top:52px;left:12px}}\n</style>\n<button id=\"launch\" type=\"button\" aria-expanded=\"false\" aria-controls=\"tools\">Mage Tools <span aria-hidden=\"true\">&#9662;</span></button>\n<div id=\"tools\" role=\"group\" aria-label=\"Mage Tools\" hidden></div>\n<div id=\"panels\"></div>";
  const el = id => root.getElementById(id);
  const launch = el("launch");
  const tools = el("tools");
  let activeTool = null;

  const showTools = visible => {
    tools.hidden = !visible;
    launch.setAttribute("aria-expanded", String(visible));
  };
  const closeTool = () => {
    activeTool?.close?.();
    activeTool = null;
  };
  const open = () => {
    closeTool();
    showTools(true);
  };
  const activate = tool => {
    closeTool();
    showTools(false);
    activeTool = tool;
    tool.open();
  };
  const addTool = tool => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = tool.label;
    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "\u203a";
    button.append(arrow);
    tools.append(button);
    button.onclick = () => activate(tool);
  };

  launch.onclick = () => tools.hidden ? open() : showTools(false);
  root.addEventListener("keydown", event => {
    if (event.key !== "Escape" || (tools.hidden && !activeTool)) return;
    event.stopPropagation();
    closeTool();
    showTools(false);
    launch.focus();
  });
  const mount = () => {
    document.body.append(host);
    window.bmrMageTools = { open };
    open();
  };

  const httpsImage = value => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
    } catch {
      return "";
    }
  };


  const addCharacterTool = () => {
    el("panels").insertAdjacentHTML("beforeend", [
      '<section id="character-panel" aria-labelledby="character-heading" hidden>',
      '<header><h2 id="character-heading">Character Image</h2><button id="character-back" type="button" aria-label="Back to Mage Tools">Back</button></header>',
      '<div class="actions" role="group" aria-label="Character">',
      '<button id="character-me" type="button" aria-pressed="true">Me</button>',
      '<button id="character-opponent" type="button" aria-pressed="false">Opponent</button></div>',
      '<form id="character-form" novalidate>',
      '<label for="character-url">Direct HTTPS image link</label><input id="character-url" type="url" autocomplete="off" placeholder="https://">',
      '<div class="actions"><button id="character-apply" type="submit">Apply image</button></div>',
      '<p id="character-status" role="status"></p></form></section>',
    ].join(""));
    const panel = el("character-panel");
    const field = el("character-url");
    const status = el("character-status");
    const apply = el("character-apply");
    const targets = [el("character-me"), el("character-opponent")];
    let target = 0;
    let request = 0;
    targets.forEach((button, index) => {
      button.onclick = () => {
        target = index;
        request++;
        apply.disabled = false;
        status.textContent = "";
        targets.forEach((option, position) => {
          option.setAttribute("aria-pressed", String(position === target));
        });
        field.focus();
      };
    });
    el("character-back").onclick = () => {
      open();
      tools.lastElementChild?.focus();
    };
    el("character-form").onsubmit = async event => {
      event.preventDefault();
      if (apply.disabled) return;
      const url = httpsImage(field.value.trim());
      const cast = typeof MESSAGECAST === "undefined" ? null : MESSAGECAST;
      if (!url) {
        status.textContent = "Paste a direct HTTPS image link.";
        return;
      }
      if (typeof cast?.changeCharacterImage !== "function") {
        status.textContent = "Run your Message Cast macro first, then try again.";
        return;
      }

      const ticket = ++request;
      const character = target;
      apply.disabled = true;
      status.textContent = "Checking the image.";
      const test = new Image();
      test.onerror = () => {
        if (ticket !== request) return;
        apply.disabled = false;
        status.textContent = "This link did not load an image.";
      };
      test.onload = async () => {
        if (ticket !== request) return;
        try {
          const result = await cast.changeCharacterImage(character, url, {
            scale: "1,1",
            backgroundSize: "auto 100%",
          });
          if (ticket === request) {
            status.textContent = result === false
              ? "Message Cast could not change the selected character image."
              : "Image sent to Message Cast for " + (character === 0 ? "your character." : "the opponent.");
          }
        } catch {
          if (ticket === request) status.textContent = "Could not change the image. Make sure the selected character is visible.";
        } finally {
          if (ticket === request) apply.disabled = false;
        }
      };
      test.src = url;
    };
    addTool({
      label: "Character Image",
      open() {
        panel.hidden = false;
        targets[target].focus();
      },
      close() {
        request++;
        apply.disabled = false;
        panel.hidden = true;
      },
    });
  };

  // A tab with the original loaded can keep using its existing image hooks.
  const legacy = window.bmrEquipmentArt;
  if (typeof legacy?.open === "function") {
    addTool({ label: "Equipment Art", open: () => legacy.open() });
    addCharacterTool();
    mount();
    return;
  }

  const game = typeof GAME_MANAGER === "undefined" ? null : GAME_MANAGER.instance;
  const images = typeof IMAGE_PROCESSING === "undefined" ? null : IMAGE_PROCESSING;
  const inventory = typeof MENU === "undefined" ? null : MENU.Inventory;
  const methods = ["getItemImage", "getWornItemImage"];
  if (!game || !inventory || methods.some(name => typeof images?.[name] !== "function")) {
    throw new Error("Open a loaded Battle Mages game tab first.");
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

  el("panels").innerHTML = [
    '<section id="panel" aria-labelledby="heading" hidden><header><h2 id="heading">Equipment Art</h2><button id="close" type="button" aria-label="Back to Mage Tools">Back</button></header>',
    '<label for="slot">Equipment slot</label><select id="slot"></select>',
    '<div class="sample"><img id="preview" alt=""><span id="item"></span></div>',
    '<label for="url">Direct HTTPS image link</label><input id="url" type="url" autocomplete="off" placeholder="https://…">',
    '<div class="actions"><button id="apply">Apply image</button><button id="reset">Reset slot</button></div>',
    '<p id="status" role="status"></p></section>',
  ].join("");

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

  const equipment = {
    label: "Equipment Art",
    open() {
      el("panel").hidden = false;
      render();
      select.focus();
    },
    close() {
      attempt++;
      el("panel").hidden = true;
    },
  };
  el("close").onclick = () => {
    open();
    tools.firstElementChild?.focus();
  };
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

  addTool(equipment);
  addCharacterTool();
  window.bmrEquipmentArt = { open: () => activate(equipment) };
  if (saved === null && Object.keys(artwork).length) save();
  redraw();
  mount();
})();
