const listNode = document.getElementById("space-list");
const warningNode = document.getElementById("warning");
const itemTemplate = document.getElementById("item-template");

const state = {
  spaces: [],
  activeSpaceId: null,
  support: { available: true, message: "" }
};

function renderWarning() {
  if (state.support.available) {
    warningNode.classList.add("hidden");
    warningNode.textContent = "";
    return;
  }
  warningNode.classList.remove("hidden");
  warningNode.textContent = state.support.message || "Containers are unavailable.";
}

async function switchTo(spaceId) {
  const result = await browser.runtime.sendMessage({ type: "space:switch", spaceId });
  if (result?.ok === false) {
    warningNode.classList.remove("hidden");
    warningNode.textContent = result.error || "Switch failed.";
    return;
  }
  window.close();
}

function createItem(label, active, color, onClick) {
  const fragment = itemTemplate.content.cloneNode(true);
  const node = fragment.querySelector(".item");
  node.textContent = label;
  if (active) {
    node.classList.add("active");
    if (color) {
      node.style.background = color;
    } else {
      node.style.background = "#334155";
    }
  }
  node.disabled = !state.support.available;
  node.addEventListener("click", onClick);
  return fragment;
}

function renderList() {
  listNode.innerHTML = "";
  listNode.appendChild(
    createItem(
      "No Space (default)",
      state.activeSpaceId === null,
      null,
      () => switchTo(null)
    )
  );

  for (const space of state.spaces) {
    const color = space.color ? `var(--space-${space.color}, #2563eb)` : null;
    listNode.appendChild(
      createItem(
        space.name,
        state.activeSpaceId === space.id,
        color,
        () => switchTo(space.id)
      )
    );
  }
}

function applyState(next) {
  state.spaces = next.spaces || [];
  state.activeSpaceId = next.activeSpaceId ?? null;
  state.support = next.support || { available: true, message: "" };
  renderWarning();
  renderList();
}

async function refresh() {
  const next = await browser.runtime.sendMessage({ type: "space:get-state" });
  applyState(next);
}

refresh();
