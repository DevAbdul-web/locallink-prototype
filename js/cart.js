// ====================
// IMPORTS
// ====================

import { getProducts, getStores } from "./data-service.js";

import "./search.js";

import { loadCart, saveCart } from "./storage.js";

import { initializeCartUI, updateCartCount } from "./cart-ui.js";

// ====================
// DOM REFERENCES
// ====================

const cartLayout = document.querySelector("#cart-layout");
const cartBusinessList = document.querySelector("#cart-business-list");

const cartEmptyState = document.querySelector("#cart-empty-state");

const cartSummaryCount = document.querySelector("#cart-summary-count");
const cartSubtotal = document.querySelector("#cart-subtotal");
const cartTotal = document.querySelector("#cart-total");

const checkoutButton = document.querySelector("#checkout-button");

// ====================
// STATE
// ====================

let cart = loadCart();

let products = [];

let stores = [];

let isCartLoading = false;

// ====================
// HELPERS
// ====================

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function getProduct(productId) {
  return products.find((product) => {
    return product.id === productId;
  });
}

function getStore(storeId) {
  return stores.find((store) => {
    return store.id === storeId;
  });
}

// ====================
// CART ITEM INFORMATION
// ====================

function getCartItemProduct(cartItem) {
  const productId = cartItem.productId ?? cartItem.id;

  return getProduct(productId);
}

function getCartItemQuantity(cartItem) {
  return Number(cartItem.quantity) || 1;
}

// ====================
// VARIANT DISPLAY
// ====================

function getSelectedVariants(cartItem) {
  const variants = cartItem.selectedVariants ?? cartItem.variants ?? {};

  if (!variants || typeof variants !== "object") {
    return [];
  }

  return Object.entries(variants).filter(([, value]) => {
    return value !== undefined && value !== null && value !== "";
  });
}

function renderSelectedVariants(cartItem) {
  const variants = getSelectedVariants(cartItem);

  if (variants.length === 0) {
    return "";
  }

  return `
    <div class="cart-item-variants">
      ${variants
        .map(([name, value]) => {
          return `
            <span>
              <strong>${formatVariantName(name)}:</strong>
              ${value}
            </span>
          `;
        })
        .join("")}
    </div>
  `;
}

function formatVariantName(name) {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_]/g, " ")
    .trim()
    .replace(/^./, (letter) => letter.toUpperCase());
}

// ====================
// GROUP CART BY BUSINESS
// ====================

function groupCartByStore() {
  const groups = {};

  cart.forEach((cartItem, index) => {
    const product = getCartItemProduct(cartItem);

    if (!product) {
      return;
    }

    const storeId = product.storeId;

    if (!groups[storeId]) {
      groups[storeId] = [];
    }

    groups[storeId].push({
      cartItem,
      product,
      cartIndex: index,
    });
  });

  return groups;
}

// ====================
// CALCULATIONS
// ====================

function calculateSubtotal() {
  return cart.reduce((total, cartItem) => {
    const product = getCartItemProduct(cartItem);

    if (!product) {
      return total;
    }

    return total + product.price * getCartItemQuantity(cartItem);
  }, 0);
}

function calculateTotalQuantity() {
  return cart.reduce((total, cartItem) => {
    return total + getCartItemQuantity(cartItem);
  }, 0);
}

// ====================
// ASYNC CART STATES
// ====================

function renderCartLoading() {
  cartEmptyState.hidden = true;

  cartLayout.hidden = false;

  cartBusinessList.innerHTML = `
    <div
      class="cart-data-state"
      aria-live="polite"
    >
      <span
        class="cart-loading-spinner"
      ></span>

      <strong>
        Loading your cart...
      </strong>

      <p>
        Getting the latest product
        and business information.
      </p>
    </div>
  `;

  checkoutButton.disabled = true;
}

function renderCartError() {
  cartEmptyState.hidden = true;

  cartLayout.hidden = false;

  cartBusinessList.innerHTML = `
    <div
      class="
        cart-data-state
        cart-error-state
      "
    >
      <i data-lucide="wifi-off"></i>

      <strong>
        Couldn't load your cart
      </strong>

      <p>
        Something went wrong while
        loading the latest product
        information.
      </p>

      <button
        type="button"
        data-action="retry-cart"
      >
        Try again
      </button>
    </div>
  `;

  checkoutButton.disabled = true;

  refreshIcons();
}

// ====================
// RENDER CART ITEM
// ====================

function createCartItemMarkup(cartItem, product, cartIndex) {
  const quantity = getCartItemQuantity(cartItem);

  const itemSubtotal = product.price * quantity;

  return `
    <article
      class="cart-item"
      data-cart-index="${cartIndex}"
    >
      <button
        type="button"
        class="cart-item-image-button"
        data-action="view-product"
        data-product-id="${product.id}"
        aria-label="View ${product.name}"
      >
        <img
          src="${product.image}"
          alt="${product.name}"
          class="cart-item-image"
        />
      </button>

      <div class="cart-item-content">
        <div class="cart-item-top">
          <div>
            <button
              type="button"
              class="cart-item-name"
              data-action="view-product"
              data-product-id="${product.id}"
            >
              ${product.name}
            </button>

            ${renderSelectedVariants(cartItem)}
          </div>

          <button
            type="button"
            class="cart-remove-button"
            data-action="remove"
            aria-label="Remove ${product.name} from cart"
          >
            <i data-lucide="trash-2"></i>
          </button>
        </div>

        <div class="cart-item-bottom">
          <div class="cart-item-pricing">
            <strong>${formatCurrency(product.price)}</strong>

            ${
              quantity > 1
                ? `<span>${formatCurrency(itemSubtotal)} total</span>`
                : ""
            }
          </div>

          <div
            class="cart-quantity-control"
            aria-label="Quantity for ${product.name}"
          >
            <button
              type="button"
              data-action="decrease"
              aria-label="Decrease quantity"
              ${quantity <= 1 ? "disabled" : ""}
            >
              <i data-lucide="minus"></i>
            </button>

            <span>${quantity}</span>

            <button
              type="button"
              data-action="increase"
              aria-label="Increase quantity"
            >
              <i data-lucide="plus"></i>
            </button>
          </div>
        </div>
      </div>
    </article>
  `;
}

// ====================
// RENDER BUSINESS GROUP
// ====================

function createBusinessGroupMarkup(storeId, items) {
  const store = getStore(Number(storeId));

  if (!store) {
    return "";
  }

  const businessSubtotal = items.reduce((total, item) => {
    return total + item.product.price * getCartItemQuantity(item.cartItem);
  }, 0);

  return `
    <section class="cart-business-group">
      <header class="cart-business-heading">
        <div class="cart-business-identity">
          <img
            src="${store.image}"
            alt="${store.name}"
            class="cart-business-image"
          />

          <div>
            <span>Fulfilled by</span>

            <button
              type="button"
              class="cart-business-name"
              data-action="view-business"
              data-store-id="${store.id}"
            >
              ${store.name}
            </button>

            <div class="cart-business-meta">
              <span>
                <i data-lucide="map-pin"></i>
                ${store.location}
              </span>

              <span>${store.distance} km away</span>
            </div>
          </div>
        </div>

        <span class="cart-business-subtotal">
          ${formatCurrency(businessSubtotal)}
        </span>
      </header>

      <div class="cart-business-items">
        ${items
          .map(({ cartItem, product, cartIndex }) => {
            return createCartItemMarkup(cartItem, product, cartIndex);
          })
          .join("")}
      </div>
    </section>
  `;
}

// ====================
// SUMMARY
// ====================

function renderSummary() {
  const subtotal = calculateSubtotal();
  const totalQuantity = calculateTotalQuantity();

  cartSummaryCount.textContent =
    totalQuantity === 1 ? "1 item" : `${totalQuantity} items`;

  cartSubtotal.textContent = formatCurrency(subtotal);
  cartTotal.textContent = formatCurrency(subtotal);
}

// ====================
// MAIN RENDER
// ====================

function renderCart() {
  // Always synchronize the summary with current cart state.
  renderSummary();

  if (cart.length === 0) {
    cartBusinessList.replaceChildren();

    cartLayout.hidden = true;
    cartEmptyState.hidden = false;

    refreshIcons();

    return;
  }

  const groupedCart = groupCartByStore();

  const groupEntries = Object.entries(groupedCart);

  if (groupEntries.length === 0) {
    cart = [];

    saveCart(cart);

    // Cart changed again, so reset the summary.
    renderSummary();

    cartBusinessList.replaceChildren();

    cartLayout.hidden = true;
    cartEmptyState.hidden = false;

    updateCartCount();

    refreshIcons();

    return;
  }

  cartEmptyState.hidden = true;
  cartLayout.hidden = false;

  cartBusinessList.innerHTML = groupEntries
    .map(([storeId, items]) => {
      return createBusinessGroupMarkup(storeId, items);
    })
    .join("");

  refreshIcons();
}

// ====================
// QUANTITY
// ====================

function increaseQuantity(cartIndex) {
  const cartItem = cart[cartIndex];

  if (!cartItem) {
    return;
  }

  cartItem.quantity = getCartItemQuantity(cartItem) + 1;

  saveCart(cart);

  updateCartCount();

  renderCart();
}

function decreaseQuantity(cartIndex) {
  const cartItem = cart[cartIndex];

  if (!cartItem) {
    return;
  }

  const currentQuantity = getCartItemQuantity(cartItem);

  if (currentQuantity <= 1) {
    return;
  }

  cartItem.quantity = currentQuantity - 1;

  saveCart(cart);

  updateCartCount();

  renderCart();
}

// ====================
// REMOVE ITEM
// ====================

function removeCartItem(cartIndex) {
  if (!cart[cartIndex]) {
    return;
  }

  cart.splice(cartIndex, 1);

  saveCart(cart);

  updateCartCount();

  renderCart();
}

// ====================
// CART ACTIONS
// ====================

function handleCartAction(event) {
  const actionButton = event.target.closest("[data-action]");

  if (!actionButton) {
    return;
  }

  const action = actionButton.dataset.action;

  if (action === "retry-cart") {
    loadCartCatalogue();

    return;
  }

  // Product navigation

  if (action === "view-product") {
    const productId = Number(actionButton.dataset.productId);

    window.location.href = `./product.html?id=${productId}`;

    return;
  }

  // Business navigation

  if (action === "view-business") {
    const storeId = Number(actionButton.dataset.storeId);

    window.location.href = `./business.html?type=store&id=${storeId}`;

    return;
  }

  // Everything below this point acts on a cart item.

  const cartItemElement = actionButton.closest(".cart-item");

  if (!cartItemElement) {
    return;
  }

  const cartIndex = Number(cartItemElement.dataset.cartIndex);

  if (action === "increase") {
    increaseQuantity(cartIndex);

    return;
  }

  if (action === "decrease") {
    decreaseQuantity(cartIndex);

    return;
  }

  if (action === "remove") {
    removeCartItem(cartIndex);
  }
}

// ====================
// CHECKOUT
// ====================

function goToCheckout() {
  if (cart.length === 0) {
    return;
  }

  window.location.href = "./checkout.html";
}

// ====================
// EVENT LISTENERS
// ====================

cartBusinessList.addEventListener("click", handleCartAction);

checkoutButton.addEventListener("click", goToCheckout);

// ====================
// LOAD CART CATALOGUE
// ====================

async function loadCartCatalogue() {
  if (isCartLoading) {
    return;
  }

  isCartLoading = true;

  renderCartLoading();

  try {
    const [loadedProducts, loadedStores] = await Promise.all([
      getProducts(),
      getStores(),
    ]);

    products = loadedProducts;
    stores = loadedStores;

    checkoutButton.disabled = false;

    renderCart();
  } catch (error) {
    console.error("Unable to load cart:", error);

    renderCartError();
  } finally {
    isCartLoading = false;
  }
}

// ====================
// INITIALIZE
// ====================

function initializeCartPage() {
  initializeCartUI();

  if (cart.length === 0) {
    renderCart();

    return;
  }

  loadCartCatalogue();
}

initializeCartPage();
