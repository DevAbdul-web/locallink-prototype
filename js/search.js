// ============================================================
// IMPORTS
// ============================================================

import {
  getProducts,
  getServices,
  getStores,
  getServiceProviders,
} from "./data-service.js";

import { renderSearchResults } from "./search-results.js";

// ============================================================
// DOM REFERENCES
// ============================================================

const overlayForm = document.querySelector("#overlay-search-form");
const overlayInput = document.querySelector("#overlay-search-input");

const searchTypeToggle = document.querySelector("#search-type-toggle");
const searchOverlay = document.querySelector("#search-overlay");
const searchResults = document.querySelector("#search-results");

const searchButton = overlayForm?.querySelector(".overlay-search-button");

// ============================================================
// APPLICATION STATE
// ============================================================

let searchType = "product";

let isSearching = false;

let lastSearch = {
  query: "",
  type: "",
};

const searchDataCache = {
  products: null,
  stores: null,
  services: null,
  providers: null,
};

// ============================================================
// CONSTANTS
// ============================================================

const RECENT_SEARCHES_KEY = "locallink-recent-searches";
const MAX_RECENT_SEARCHES = 6;

// ============================================================
// TEXT HELPERS
// ============================================================

function normalizeText(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ");
}

function getWords(value = "") {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return [];
  }

  return normalizedValue.split(" ");
}

// ============================================================
// MATCH SCORING
// ============================================================

function scoreText(
  value,
  query,
  queryWords,
  { phraseScore = 0, exactScore = 0, prefixScore = 0, containsScore = 0 },
) {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return 0;
  }

  const fieldWords = getWords(normalizedValue);

  let score = 0;

  // Exact full-field match.
  if (normalizedValue === query) {
    score += phraseScore * 1.5;
  }
  // Phrase appears naturally inside the field.
  else if (query.length > 1 && normalizedValue.includes(query)) {
    score += phraseScore;
  }

  queryWords.forEach((queryWord) => {
    if (!queryWord) {
      return;
    }

    const exactMatch = fieldWords.some((word) => {
      return word === queryWord;
    });

    if (exactMatch) {
      score += exactScore;
      return;
    }

    const prefixMatch = fieldWords.some((word) => {
      return word.startsWith(queryWord);
    });

    if (prefixMatch) {
      score += prefixScore;
      return;
    }

    const containsMatch = fieldWords.some((word) => {
      return word.includes(queryWord);
    });

    if (containsMatch) {
      score += containsScore;
    }
  });

  return score;
}

function getQueryCoverage(fields, queryWords) {
  if (queryWords.length === 0) {
    return 0;
  }

  const searchableText = normalizeText(fields.filter(Boolean).join(" "));

  const searchableWords = getWords(searchableText);

  const matchedWords = queryWords.filter((queryWord) => {
    return searchableWords.some((word) => {
      return (
        word === queryWord ||
        word.startsWith(queryWord) ||
        word.includes(queryWord)
      );
    });
  });

  return matchedWords.length / queryWords.length;
}

// ============================================================
// PRODUCT SCORING
// ============================================================

function getProductScore(product, query, queryWords) {
  const nameScore = scoreText(product.name, query, queryWords, {
    phraseScore: 40,
    exactScore: 18,
    prefixScore: 12,
    containsScore: 6,
  });

  const brandScore = scoreText(product.brand, query, queryWords, {
    phraseScore: 25,
    exactScore: 12,
    prefixScore: 8,
    containsScore: 4,
  });

  const categoryScore = scoreText(product.category, query, queryWords, {
    phraseScore: 20,
    exactScore: 10,
    prefixScore: 7,
    containsScore: 3,
  });

  const descriptionScore = scoreText(product.description, query, queryWords, {
    phraseScore: 10,
    exactScore: 5,
    prefixScore: 3,
    containsScore: 1,
  });

  const coverage = getQueryCoverage(
    [product.name, product.brand, product.category, product.description],
    queryWords,
  );

  const coverageBonus = coverage * 20;

  return (
    nameScore + brandScore + categoryScore + descriptionScore + coverageBonus
  );
}

// ============================================================
// SERVICE SCORING
// ============================================================

function getServiceScore(service, query, queryWords) {
  const nameScore = scoreText(service.name, query, queryWords, {
    phraseScore: 40,
    exactScore: 18,
    prefixScore: 12,
    containsScore: 6,
  });

  const categoryScore = scoreText(service.category, query, queryWords, {
    phraseScore: 22,
    exactScore: 11,
    prefixScore: 7,
    containsScore: 3,
  });

  const descriptionScore = scoreText(service.description, query, queryWords, {
    phraseScore: 10,
    exactScore: 5,
    prefixScore: 3,
    containsScore: 1,
  });

  const coverage = getQueryCoverage(
    [service.name, service.category, service.description],
    queryWords,
  );

  const coverageBonus = coverage * 20;

  return nameScore + categoryScore + descriptionScore + coverageBonus;
}

// ============================================================
// BUSINESS RANKING
// ============================================================

function getBusinessRankingScore(itemScores) {
  if (itemScores.length === 0) {
    return 0;
  }

  const sortedScores = [...itemScores].sort((a, b) => b - a);

  const bestMatch = sortedScores[0];

  const supportingMatches = sortedScores.slice(1, 4).reduce((total, score) => {
    return total + score * 0.25;
  }, 0);

  const matchCountBonus = Math.min(itemScores.length, 5) * 2;

  return bestMatch + supportingMatches + matchCountBonus;
}

// ============================================================
// DATA LOADING / CACHE
// ============================================================

async function getProductSearchData() {
  if (!searchDataCache.products) {
    searchDataCache.products = getProducts();
  }

  if (!searchDataCache.stores) {
    searchDataCache.stores = getStores();
  }

  const [products, stores] = await Promise.all([
    searchDataCache.products,
    searchDataCache.stores,
  ]);

  return {
    products,
    stores,
  };
}

async function getServiceSearchData() {
  if (!searchDataCache.services) {
    searchDataCache.services = getServices();
  }

  if (!searchDataCache.providers) {
    searchDataCache.providers = getServiceProviders();
  }

  const [services, providers] = await Promise.all([
    searchDataCache.services,
    searchDataCache.providers,
  ]);

  return {
    services,
    providers,
  };
}

// ============================================================
// PRODUCT SEARCH
// ============================================================

export async function searchProducts(query) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return [];
  }

  const queryWords = getWords(normalizedQuery);

  const { products, stores } = await getProductSearchData();

  const scoredProducts = products
    .map((product) => {
      return {
        product,
        score: getProductScore(product, normalizedQuery, queryWords),
      };
    })
    .filter((result) => {
      return result.score > 0;
    })
    .sort((a, b) => {
      return b.score - a.score;
    });

  const groupedStores = new Map();

  scoredProducts.forEach(({ product, score }) => {
    const storeId = product.storeId;

    if (!groupedStores.has(storeId)) {
      groupedStores.set(storeId, {
        productIds: [],
        matchingItems: [],
        itemScores: [],
      });
    }

    const storeResult = groupedStores.get(storeId);

    storeResult.productIds.push(product.id);
    storeResult.matchingItems.push(product);
    storeResult.itemScores.push(score);
  });

  const matchingStores = [];

  groupedStores.forEach((result, storeId) => {
    const store = stores.find((store) => {
      return store.id === storeId;
    });

    if (!store) {
      return;
    }

    matchingStores.push({
      store,

      productIds: result.productIds,

      matchingItems: result.matchingItems,

      bestMatchScore: Math.max(...result.itemScores),

      score: getBusinessRankingScore(result.itemScores),
    });
  });

  matchingStores.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return (a.store.distance ?? Infinity) - (b.store.distance ?? Infinity);
  });

  return matchingStores;
}

// ============================================================
// SERVICE SEARCH
// ============================================================

export async function searchServices(query) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return [];
  }

  const queryWords = getWords(normalizedQuery);

  const { services, providers } = await getServiceSearchData();

  const scoredServices = services
    .map((service) => {
      return {
        service,
        score: getServiceScore(service, normalizedQuery, queryWords),
      };
    })
    .filter((result) => {
      return result.score > 0;
    })
    .sort((a, b) => {
      return b.score - a.score;
    });

  const groupedProviders = new Map();

  scoredServices.forEach(({ service, score }) => {
    const providerId = service.providerId;

    if (!groupedProviders.has(providerId)) {
      groupedProviders.set(providerId, {
        serviceIds: [],
        matchingItems: [],
        itemScores: [],
      });
    }

    const providerResult = groupedProviders.get(providerId);

    providerResult.serviceIds.push(service.id);
    providerResult.matchingItems.push(service);
    providerResult.itemScores.push(score);
  });

  const matchingProviders = [];

  groupedProviders.forEach((result, providerId) => {
    const provider = providers.find((provider) => {
      return provider.id === providerId;
    });

    if (!provider) {
      return;
    }

    matchingProviders.push({
      provider,

      serviceIds: result.serviceIds,

      matchingItems: result.matchingItems,

      bestMatchScore: Math.max(...result.itemScores),

      score: getBusinessRankingScore(result.itemScores),
    });
  });

  matchingProviders.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return (
      (a.provider.distance ?? Infinity) - (b.provider.distance ?? Infinity)
    );
  });

  return matchingProviders;
}

// ============================================================
// RECENT SEARCHES
// ============================================================

function getRecentSearches() {
  try {
    const savedSearches = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY));

    if (!Array.isArray(savedSearches)) {
      return [];
    }

    return savedSearches;
  } catch (error) {
    console.warn("Unable to read recent searches:", error);

    return [];
  }
}

function saveRecentSearch(query, type) {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return;
  }

  const recentSearches = getRecentSearches();

  const filteredSearches = recentSearches.filter((search) => {
    return !(
      normalizeText(search.query) === normalizeText(normalizedQuery) &&
      search.type === type
    );
  });

  const updatedSearches = [
    {
      query: normalizedQuery,
      type,
    },
    ...filteredSearches,
  ].slice(0, MAX_RECENT_SEARCHES);

  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updatedSearches));
  } catch (error) {
    console.warn("Unable to save recent search:", error);
  }

  renderRecentSearches();
}

function renderRecentSearches() {
  if (!searchOverlay) {
    return;
  }

  let recentArea = searchOverlay.querySelector("#recent-searches");

  const recentSearches = getRecentSearches();

  if (recentSearches.length === 0) {
    recentArea?.remove();

    return;
  }

  if (!recentArea) {
    recentArea = document.createElement("section");

    recentArea.id = "recent-searches";
    recentArea.classList.add("recent-searches");

    const searchTypeArea = searchOverlay.querySelector(".search-type-area");

    searchTypeArea?.insertAdjacentElement("afterend", recentArea);
  }

  recentArea.innerHTML = `
    <div class="recent-searches-header">
      <p>Recent searches</p>

      <button
        type="button"
        data-action="clear-recent-searches"
      >
        Clear
      </button>
    </div>

    <div class="recent-search-list">
      ${recentSearches
        .map((search) => {
          const icon =
            search.type === "product" ? "shopping-bag" : "briefcase-business";

          return `
            <button
              type="button"
              class="recent-search-chip"
              data-action="recent-search"
              data-query="${escapeAttribute(search.query)}"
              data-type="${search.type}"
            >
              <i data-lucide="${icon}"></i>

              <span>
                ${escapeHTML(search.query)}
              </span>
            </button>
          `;
        })
        .join("")}
    </div>
  `;

  refreshIcons();
}

// ============================================================
// SAFE TEXT OUTPUT
// ============================================================

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHTML(value);
}

// ============================================================
// SEARCH TYPE
// ============================================================

function setSearchType(type) {
  if (type !== "product" && type !== "service") {
    return;
  }

  searchType = type;

  if (!searchTypeToggle) {
    return;
  }

  searchTypeToggle.querySelectorAll("[type='button']").forEach((button) => {
    button.classList.toggle("active", button.value === type);

    button.setAttribute(
      "aria-pressed",
      button.value === type ? "true" : "false",
    );
  });
}

// ============================================================
// FEEDBACK MESSAGE
// ============================================================

function showSearchMessage(message) {
  if (!overlayForm) {
    return;
  }

  const existingMessage = overlayForm.querySelector(".error-message");

  existingMessage?.remove();

  const newMessage = document.createElement("div");

  newMessage.classList.add("error-message");
  newMessage.textContent = message;

  overlayForm.append(newMessage);

  setTimeout(() => {
    newMessage.remove();
  }, 2500);
}

// ============================================================
// LOADING UI
// ============================================================

function showSearchLoading() {
  if (!searchResults || !overlayForm) {
    return;
  }

  overlayForm.classList.add("search-is-loading");

  if (searchButton) {
    searchButton.disabled = true;
  }

  searchResults.innerHTML = `
    <div class="search-loading-state">

      <span class="search-loading-spinner"></span>

      <strong>
        Searching LocalLink...
      </strong>

      <p>
        Finding the most relevant results near you.
      </p>

    </div>
  `;
}

function hideSearchLoading() {
  overlayForm?.classList.remove("search-is-loading");

  if (searchButton) {
    searchButton.disabled = false;
  }
}

// ============================================================
// EXECUTE SEARCH
// ============================================================

async function performSearch(query, type = searchType) {
  const cleanedQuery = query.trim();

  if (!cleanedQuery) {
    showSearchMessage("Please enter a search term.");

    overlayInput?.focus();

    return;
  }

  if (isSearching) {
    return;
  }

  setSearchType(type);

  const normalizedQuery = normalizeText(cleanedQuery);

  const isSameSearch =
    lastSearch.query === normalizedQuery && lastSearch.type === searchType;

  if (isSameSearch) {
    return;
  }

  isSearching = true;

  showSearchLoading();

  try {
    let results = [];

    if (searchType === "product") {
      results = await searchProducts(cleanedQuery);
    } else {
      results = await searchServices(cleanedQuery);
    }

    lastSearch = {
      query: normalizedQuery,
      type: searchType,
    };

    saveRecentSearch(cleanedQuery, searchType);

    renderSearchResults(results, cleanedQuery, searchType);
  } catch (error) {
    console.error("Unable to search LocalLink:", error);

    showSearchMessage("Search couldn't be completed. Please try again.");

    if (searchResults) {
      searchResults.replaceChildren();
    }
  } finally {
    isSearching = false;

    hideSearchLoading();
  }
}

// ============================================================
// FORM SUBMISSION
// ============================================================

overlayForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  await performSearch(overlayInput.value);
});

// ============================================================
// SEARCH TYPE EVENTS
// ============================================================

searchTypeToggle?.addEventListener("click", (event) => {
  const button = event.target.closest("[type='button']");

  if (!button) {
    return;
  }

  if (button.value === searchType) {
    return;
  }

  setSearchType(button.value);

  /*
   * Changing the search type means the previous result no
   * longer represents the currently selected search context.
   */
  lastSearch = {
    query: "",
    type: "",
  };
});

// ============================================================
// OPEN SEARCH
// ============================================================

document
  .querySelectorAll("[data-action='open-search']")
  .forEach((searchTrigger) => {
    searchTrigger.addEventListener("click", () => {
      if (!searchOverlay) {
        return;
      }

      searchOverlay.classList.add("open");

      searchOverlay.setAttribute("aria-hidden", "false");

      document.body.classList.add("search-open");

      renderRecentSearches();

      setTimeout(() => {
        overlayInput?.focus();
      }, 250);
    });
  });

// ============================================================
// CLOSE SEARCH
// ============================================================

function closeSearch() {
  if (!searchOverlay) {
    return;
  }

  overlayInput?.blur();

  searchOverlay.classList.remove("open");

  searchOverlay.setAttribute("aria-hidden", "true");

  document.body.classList.remove("search-open");
}

searchOverlay?.addEventListener("click", (event) => {
  const closeButton = event.target.closest("#close-search");

  if (closeButton) {
    closeSearch();

    return;
  }

  const recentSearchButton = event.target.closest(
    '[data-action="recent-search"]',
  );

  if (recentSearchButton) {
    const query = recentSearchButton.dataset.query;

    const type = recentSearchButton.dataset.type;

    overlayInput.value = query;

    lastSearch = {
      query: "",
      type: "",
    };

    performSearch(query, type);

    return;
  }

  const clearRecentButton = event.target.closest(
    '[data-action="clear-recent-searches"]',
  );

  if (clearRecentButton) {
    localStorage.removeItem(RECENT_SEARCHES_KEY);

    renderRecentSearches();
  }

  const suggestionButton = event.target.closest(
    '[data-action="search-suggestion"]',
  );

  if (suggestionButton) {
    const query = suggestionButton.dataset.query;

    const type = suggestionButton.dataset.type;

    overlayInput.value = query;

    lastSearch = {
      query: "",
      type: "",
    };

    performSearch(query, type);
  }
});

// ============================================================
// KEYBOARD EVENTS
// ============================================================

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && searchOverlay?.classList.contains("open")) {
    closeSearch();
  }
});

// ============================================================
// ICONS
// ============================================================

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// ============================================================
// INITIALIZATION
// ============================================================

function initializeSearch() {
  setSearchType("product");

  renderRecentSearches();

  refreshIcons();
}

initializeSearch();
