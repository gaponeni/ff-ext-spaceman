const listNode = document.getElementById("space-list");
const warningNode = document.getElementById("warning");
const itemTemplate = document.getElementById("item-template");
const optionsButton = document.getElementById("open-options");

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
  try {
    const result = await browser.runtime.sendMessage({ type: "space:switch", spaceId });
    if (result?.ok === false) {
      warningNode.classList.remove("hidden");
      warningNode.textContent = result.error || "Switch failed.";
      return;
    }
    window.close();
  } catch (error) {
    warningNode.classList.remove("hidden");
    warningNode.textContent = error?.message || "Switch failed.";
  }
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
  try {
    const next = await browser.runtime.sendMessage({ type: "space:get-state" });
    applyState(next || {
      spaces: [],
      activeSpaceId: null,
      support: {
        available: false,
        message: "Extension state is unavailable."
      }
    });
  } catch (error) {
    applyState({
      spaces: [],
      activeSpaceId: null,
      support: {
        available: false,
        message: error?.message || "Extension state is unavailable."
      }
    });
  }
}

if (optionsButton) {
  optionsButton.addEventListener("click", async () => {
    try {
      await browser.runtime.openOptionsPage();
      window.close();
    } catch (_error) {
      const optionsUrl = browser.runtime.getURL("settings/index.html");
      await browser.tabs.create({ url: optionsUrl });
      window.close();
    }
  });
}

refresh();
