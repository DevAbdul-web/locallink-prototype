// ============================================================
// IMPORTS
// ============================================================

import "./categories.js";
import "./search.js";

import { getStores, getServiceProviders } from "./data-service.js";

import { renderStores, stores } from "./stores.js";

import {
  renderServiceProviders,
  serviceProviders,
} from "./service-providers.js";

// ============================================================
// DOM REFERENCES
// ============================================================

const seeMoreStores = document.querySelector("#see-all-stores");

const seeMoreProviders = document.querySelector("#see-all-services");

// ============================================================
// STATE
// ============================================================

let isHomeLoading = false;

// ============================================================
// HELPERS
// ============================================================

function getNearbyItems(data, limit) {
  return [...data].sort((a, b) => a.distance - b.distance).slice(0, limit);
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// ============================================================
// LOADING STATE
// ============================================================

function renderLoadingState() {
  stores.innerHTML = `
    <div
      class="home-data-state"
      aria-live="polite"
    >
      <span
        class="home-loading-spinner"
      ></span>

      <p>
        Finding nearby stores...
      </p>
    </div>
  `;

  serviceProviders.innerHTML = `
    <div
      class="home-data-state"
      aria-live="polite"
    >
      <span
        class="home-loading-spinner"
      ></span>

      <p>
        Finding nearby services...
      </p>
    </div>
  `;
}

// ============================================================
// ERROR STATE
// ============================================================

function renderErrorState() {
  stores.innerHTML = `
    <div
      class="
        home-data-state
        home-error-state
      "
    >
      <i data-lucide="wifi-off"></i>

      <strong>
        Couldn't load nearby stores
      </strong>

      <p>
        Something went wrong while
        loading LocalLink data.
      </p>

      <button
        type="button"
        data-action="retry-home-data"
      >
        Try again
      </button>
    </div>
  `;

  serviceProviders.innerHTML = `
    <div
      class="
        home-data-state
        home-error-state
      "
    >
      <i data-lucide="wifi-off"></i>

      <strong>
        Couldn't load nearby services
      </strong>

      <p>
        Something went wrong while
        loading nearby providers.
      </p>

      <button
        type="button"
        data-action="retry-home-data"
      >
        Try again
      </button>
    </div>
  `;

  refreshIcons();
}

// ============================================================
// LOAD HOME DATA
// ============================================================

async function loadHomeData() {
  if (isHomeLoading) {
    return;
  }

  isHomeLoading = true;

  renderLoadingState();

  try {
    const [storesData, serviceProvidersData] = await Promise.all([
      getStores(),
      getServiceProviders(),
    ]);

    const nearbyStores = getNearbyItems(storesData, 6);

    const nearbyServices = getNearbyItems(serviceProvidersData, 6);

    renderStores(nearbyStores);

    renderServiceProviders(nearbyServices);

    refreshIcons();
  } catch (error) {
    console.error("Unable to load home data:", error);

    renderErrorState();
  } finally {
    isHomeLoading = false;
  }
}

// ============================================================
// NAVIGATION
// ============================================================

seeMoreStores?.addEventListener("click", () => {
  window.location.href = "category.html?type=stores";
});

seeMoreProviders?.addEventListener("click", () => {
  window.location.href = "category.html?type=providers";
});

// ============================================================
// STORE EVENTS
// ============================================================

stores?.addEventListener("click", (event) => {
  const viewBusinessButton = event.target.closest(
    "[data-action='view-business']",
  );

  if (!viewBusinessButton) {
    return;
  }

  const business = event.target.closest("[data-id]");

  if (!business) {
    return;
  }

  const storeId = business.dataset.id;

  window.location.href =
    "business.html?type=store&id=" + encodeURIComponent(storeId);
});

// ============================================================
// PROVIDER EVENTS
// ============================================================

serviceProviders?.addEventListener("click", (event) => {
  const viewBusinessButton = event.target.closest(
    "[data-action='view-business']",
  );

  if (!viewBusinessButton) {
    return;
  }

  const business = event.target.closest("[data-id]");

  if (!business) {
    return;
  }

  const providerId = business.dataset.id;

  window.location.href =
    "business.html?type=provider&id=" + encodeURIComponent(providerId);
});

// ============================================================
// RETRY
// ============================================================

document.addEventListener("click", (event) => {
  const retryButton = event.target.closest('[data-action="retry-home-data"]');

  if (!retryButton) {
    return;
  }

  loadHomeData();
});

// ============================================================
// INITIALIZE
// ============================================================

async function initializeHome() {
  refreshIcons();

  await loadHomeData();
}

initializeHome();
