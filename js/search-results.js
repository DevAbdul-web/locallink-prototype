// ============================================================
// DOM REFERENCES
// ============================================================

const searchResults = document.querySelector("#search-results");

// ============================================================
// HELPERS
// ============================================================

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function formatCurrency(value) {
  return `₦${Number(value || 0).toLocaleString("en-NG")}`;
}

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getDistanceText(distance) {
  const numericDistance = Number(distance);

  if (!Number.isFinite(numericDistance)) {
    return "";
  }

  return `${numericDistance} km`;
}

function getRatingText(rating) {
  const numericRating = Number(rating);

  if (!Number.isFinite(numericRating)) {
    return "";
  }

  return numericRating.toFixed(1);
}

function getLocationText(business) {
  return (
    business.location || business.address || business.area || "Local business"
  );
}

// ============================================================
// RESULT STATISTICS
// ============================================================

function getTotalMatchingItems(results) {
  return results.reduce((total, result) => {
    return total + (result.matchingItems?.length || 0);
  }, 0);
}

function getResultSummary(results, searchType) {
  const businessCount = results.length;

  const matchingItemCount = getTotalMatchingItems(results);

  if (searchType === "product") {
    return {
      eyebrow: "Product search",

      title: `${matchingItemCount} matching ${
        matchingItemCount === 1 ? "product" : "products"
      }`,

      description: `Found across ${businessCount} ${
        businessCount === 1 ? "local store" : "local stores"
      }.`,
    };
  }

  return {
    eyebrow: "Service search",

    title: `${matchingItemCount} matching ${
      matchingItemCount === 1 ? "service" : "services"
    }`,

    description: `Found across ${businessCount} ${
      businessCount === 1 ? "local provider" : "local providers"
    }.`,
  };
}

// ============================================================
// MATCHING ITEM CARD
// ============================================================

function renderMatchingItem(item, searchType) {
  const isProduct = searchType === "product";

  const image = item.image
    ? `
        <img
          src="${escapeHTML(item.image)}"
          alt="${escapeHTML(item.name)}"
          loading="lazy"
        />
      `
    : `
        <div class="search-item-placeholder">
          <i
            data-lucide="${isProduct ? "package" : "briefcase-business"}"
          ></i>
        </div>
      `;

  const price =
    item.price !== undefined && item.price !== null
      ? formatCurrency(item.price)
      : "";

  return `
    <button
      type="button"
      class="search-matching-item"
      data-action="${isProduct ? "view-product" : "view-service"}"
      data-id="${escapeHTML(item.id)}"
    >

      <span class="search-matching-item-image">
        ${image}
      </span>

      <span class="search-matching-item-content">

        <strong>
          ${escapeHTML(item.name)}
        </strong>

        ${
          item.category
            ? `
              <small>
                ${escapeHTML(item.category)}
              </small>
            `
            : ""
        }

        ${
          price
            ? `
              <span class="search-matching-item-price">
                ${price}
              </span>
            `
            : ""
        }

      </span>

      <i
        class="search-matching-item-arrow"
        data-lucide="arrow-up-right"
      ></i>

    </button>
  `;
}

// ============================================================
// MATCHING ITEMS
// ============================================================

function renderMatchingItems(result, searchType) {
  const matchingItems = result.matchingItems || [];

  if (matchingItems.length === 0) {
    return "";
  }

  /*
   * We deliberately don't render every matching item.
   * A store/provider can eventually contain many results.
   */
  const visibleItems = matchingItems.slice(0, 3);

  const remainingCount = matchingItems.length - visibleItems.length;

  const itemLabel = searchType === "product" ? "product" : "service";

  return `
    <div class="search-business-matches">

      <div class="search-business-matches-heading">

        <div>
          <span>
            Matching ${itemLabel}${matchingItems.length === 1 ? "" : "s"}
          </span>

          <strong>
            ${matchingItems.length}
            ${matchingItems.length === 1 ? "match" : "matches"}
          </strong>
        </div>

        ${
          remainingCount > 0
            ? `
              <small>
                +${remainingCount} more
              </small>
            `
            : ""
        }

      </div>

      <div class="search-matching-items">

        ${visibleItems
          .map((item) => {
            return renderMatchingItem(item, searchType);
          })
          .join("")}

      </div>

    </div>
  `;
}

// ============================================================
// BUSINESS RESULT
// ============================================================

function renderBusinessResult(result, searchType) {
  const isProductSearch = searchType === "product";

  const business = isProductSearch ? result.store : result.provider;

  if (!business) {
    return "";
  }

  const distance = getDistanceText(business.distance);

  const rating = getRatingText(business.rating);

  const location = getLocationText(business);

  const image = business.image || business.profileImage || business.logo || "";

  const category =
    business.category ||
    business.serviceCategory ||
    (isProductSearch ? "Store" : "Service provider");

  return `
    <article
      class="search-business-card"
      data-business-id="${escapeHTML(business.id)}"
      data-business-type="${isProductSearch ? "store" : "provider"}"
    >

      <!-- BUSINESS -->

      <div class="search-business-main">

        <div class="search-business-image">

          ${
            image
              ? `
                <img
                  src="${escapeHTML(image)}"
                  alt="${escapeHTML(business.name)}"
                  loading="lazy"
                />
              `
              : `
                <div class="search-business-placeholder">
                  <i
                    data-lucide="${
                      isProductSearch ? "store" : "briefcase-business"
                    }"
                  ></i>
                </div>
              `
          }

        </div>


        <div class="search-business-information">

          <div class="search-business-title-row">

            <div>

              <span class="search-business-category">
                ${escapeHTML(category)}
              </span>

              <h3>
                ${escapeHTML(business.name)}
              </h3>

            </div>


            <button
              type="button"
              class="search-view-business"
              data-action="view-business"
              data-id="${escapeHTML(business.id)}"
              data-type="${isProductSearch ? "store" : "provider"}"
            >
              <span>
                ${isProductSearch ? "View store" : "View provider"}
              </span>

              <i data-lucide="arrow-right"></i>
            </button>

          </div>


          <div class="search-business-meta">

            ${
              rating
                ? `
                  <span>
                    <i data-lucide="star"></i>

                    ${rating}
                  </span>
                `
                : ""
            }

            ${
              distance
                ? `
                  <span>
                    <i data-lucide="navigation"></i>

                    ${escapeHTML(distance)}
                  </span>
                `
                : ""
            }

            <span class="search-business-location">
              <i data-lucide="map-pin"></i>

              ${escapeHTML(location)}
            </span>

          </div>

        </div>

      </div>


      <!-- MATCHES -->

      ${renderMatchingItems(result, searchType)}

    </article>
  `;
}

// ============================================================
// EMPTY STATE
// ============================================================

function renderEmptyState(query, searchType) {
  const isProduct = searchType === "product";

  searchResults.innerHTML = `
    <div class="search-empty-state">

      <span class="search-empty-icon">
        <i data-lucide="search-x"></i>
      </span>

      <span class="search-empty-eyebrow">
        No matches found
      </span>

      <h3>
        We couldn't find
        ${isProduct ? "products" : "services"}
        matching
        “${escapeHTML(query)}”
      </h3>

      <p>
        ${
          isProduct
            ? "Try a shorter product name, another brand, or a broader category."
            : "Try a shorter service name or a broader service category."
        }
      </p>

      <div class="search-empty-suggestions">

        <span>Try searching for</span>

        <div>
          ${
            isProduct
              ? `
                <button
                  type="button"
                  data-action="search-suggestion"
                  data-query="rice"
                  data-type="product"
                >
                  Rice
                </button>

                <button
                  type="button"
                  data-action="search-suggestion"
                  data-query="phone"
                  data-type="product"
                >
                  Phone
                </button>

                <button
                  type="button"
                  data-action="search-suggestion"
                  data-query="electronics"
                  data-type="product"
                >
                  Electronics
                </button>
              `
              : `
                <button
                  type="button"
                  data-action="search-suggestion"
                  data-query="plumbing"
                  data-type="service"
                >
                  Plumbing
                </button>

                <button
                  type="button"
                  data-action="search-suggestion"
                  data-query="repair"
                  data-type="service"
                >
                  Repair
                </button>

                <button
                  type="button"
                  data-action="search-suggestion"
                  data-query="electrician"
                  data-type="service"
                >
                  Electrician
                </button>
              `
          }
        </div>

      </div>

    </div>
  `;

  refreshIcons();
}

// ============================================================
// RESULTS HEADER
// ============================================================

function renderResultsHeader(results, query, searchType) {
  const summary = getResultSummary(results, searchType);

  return `
    <header class="search-results-header">

      <div>

        <span class="search-results-eyebrow">
          ${summary.eyebrow}
        </span>

        <h2>
          Results for
          <span>
            “${escapeHTML(query)}”
          </span>
        </h2>

        <p>
          <strong>
            ${summary.title}
          </strong>

          ${summary.description}
        </p>

      </div>

    </header>
  `;
}

// ============================================================
// RENDER RESULTS
// ============================================================

export function renderSearchResults(results, query, searchType) {
  if (!searchResults) {
    return;
  }

  if (!Array.isArray(results)) {
    results = [];
  }

  if (results.length === 0) {
    renderEmptyState(query, searchType);

    return;
  }

  searchResults.innerHTML = `
    <section class="search-results-section">

      ${renderResultsHeader(results, query, searchType)}

      <div class="search-business-results">

        ${results
          .map((result) => {
            return renderBusinessResult(result, searchType);
          })
          .join("")}

      </div>

    </section>
  `;

  refreshIcons();
}

// ============================================================
// NAVIGATION
// ============================================================

searchResults?.addEventListener("click", (event) => {
  // --------------------------------------------------------
  // PRODUCT
  // --------------------------------------------------------

  const productButton = event.target.closest('[data-action="view-product"]');

  if (productButton) {
    const productId = productButton.dataset.id;

    window.location.href = `product.html?id=${encodeURIComponent(productId)}`;

    return;
  }

  // --------------------------------------------------------
  // SERVICE
  // --------------------------------------------------------

  const serviceButton = event.target.closest('[data-action="view-service"]');

  if (serviceButton) {
    const serviceId = serviceButton.dataset.id;

    window.location.href = `service.html?id=${encodeURIComponent(serviceId)}`;

    return;
  }

  // --------------------------------------------------------
  // BUSINESS
  // --------------------------------------------------------

  const businessButton = event.target.closest('[data-action="view-business"]');

  if (businessButton) {
    const businessId = businessButton.dataset.id;

    const businessType = businessButton.dataset.type;

    window.location.href = `business.html?type=${encodeURIComponent(
      businessType,
    )}&id=${encodeURIComponent(businessId)}`;
  }
});
