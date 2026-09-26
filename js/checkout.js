// ======================================================
// IMPORTS
// ======================================================

import {
  loadCart,
  saveCart,
  loadOrders,
  saveOrders,
  loadUserProfile,
} from "./storage.js";

import { getProducts, getStores } from "./data-service.js";

import { initializeCartUI, updateCartCount } from "./cart-ui.js";

import "./search.js";

// ======================================================
// DOM REFERENCES
// ======================================================

const checkoutLayout = document.querySelector("#checkout-layout");

const emptyState = document.querySelector("#checkout-empty-state");

// CUSTOMER PROFILE

const customerNameElement = document.querySelector("#checkout-customer-name");

const customerPhoneElement = document.querySelector("#checkout-customer-phone");

// FULFILLMENT

const fulfillmentList = document.querySelector("#checkout-fulfillment-list");

// ADDRESS

const addressSection = document.querySelector("#checkout-address-section");

const savedAddressElement = document.querySelector("#checkout-saved-address");

const noAddressElement = document.querySelector("#checkout-no-address");

const addressLabelElement = document.querySelector("#checkout-address-label");

const addressValueElement = document.querySelector("#checkout-address-value");

const addressLandmarkElement = document.querySelector(
  "#checkout-address-landmark",
);

const addressDefaultBadge = document.querySelector(
  "#checkout-address-default-badge",
);

// ADDRESS SELECTOR

const addressModal = document.querySelector("#checkout-address-modal");

const addressOptions = document.querySelector("#checkout-address-options");

const useAddressButton = document.querySelector("#checkout-use-address-button");

// ORDER NOTE

const noteInput = document.querySelector("#checkout-note");

const noteCount = document.querySelector("#checkout-note-count");

// SUMMARY

const summaryBusinesses = document.querySelector(
  "#checkout-summary-businesses",
);

const subtotalElement = document.querySelector("#checkout-subtotal");

const deliveryFeeElement = document.querySelector("#checkout-delivery-fee");

const serviceFeeElement = document.querySelector("#checkout-service-fee");

const totalElement = document.querySelector("#checkout-total");

const placeOrderButton = document.querySelector("#place-order-button");

const paymentButtonLabel = document.querySelector(
  "#checkout-payment-button-label",
);

// ======================================================
// APPLICATION STATE
// ======================================================

let cart = loadCart();

let products = [];

let stores = [];

let customerProfile = null;

let selectedAddressId = null;

let pendingAddressId = null;

const fulfillmentSelections = {};

let isCheckoutLoading = false;

let areCheckoutEventsAttached = false;

// ======================================================
// DELIVERY PRICING
// ======================================================

function calculateBusinessDeliveryFee(distance) {
  const distanceInKm = Number(distance);

  if (distanceInKm <= 2) {
    return 700;
  }

  if (distanceInKm <= 4) {
    return 1000;
  }

  if (distanceInKm <= 6) {
    return 1300;
  }

  const extraDistance = Math.ceil(distanceInKm - 6);

  return 1300 + extraDistance * 200;
}

// ======================================================
// GENERAL HELPERS
// ======================================================

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function formatCurrency(value) {
  return `₦${Number(value).toLocaleString("en-NG")}`;
}

function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ======================================================
// CUSTOMER PROFILE
// ======================================================

function initializeCustomerProfile() {
  customerProfile = loadUserProfile();

  if (!customerProfile) {
    customerNameElement.textContent = "Profile unavailable";

    customerPhoneElement.textContent = "Profile unavailable";

    return;
  }

  renderCustomerProfile();

  initializeSelectedAddress();
}

function renderCustomerProfile() {
  if (!customerProfile) {
    return;
  }

  customerNameElement.textContent = customerProfile.name || "Not provided";

  customerPhoneElement.textContent = customerProfile.phone || "Not provided";
}

// ======================================================
// ADDRESS HELPERS
// ======================================================

function getSavedAddresses() {
  return customerProfile?.addresses || [];
}

function getSelectedAddress() {
  const addresses = getSavedAddresses();

  return addresses.find((address) => {
    return address.id === selectedAddressId;
  });
}

function initializeSelectedAddress() {
  const addresses = getSavedAddresses();

  if (addresses.length === 0) {
    selectedAddressId = null;

    renderSelectedAddress();

    return;
  }

  const defaultAddress = addresses.find((address) => {
    return address.isDefault;
  });

  selectedAddressId = defaultAddress?.id ?? addresses[0].id;

  renderSelectedAddress();
}

// ======================================================
// RENDER SELECTED ADDRESS
// ======================================================

function renderSelectedAddress() {
  const selectedAddress = getSelectedAddress();

  if (!selectedAddress) {
    savedAddressElement.hidden = true;

    noAddressElement.hidden = false;

    return;
  }

  savedAddressElement.hidden = false;

  noAddressElement.hidden = true;

  addressLabelElement.textContent = selectedAddress.label;

  addressValueElement.textContent = selectedAddress.address;

  addressDefaultBadge.hidden = !selectedAddress.isDefault;

  if (selectedAddress.landmark) {
    addressLandmarkElement.textContent = `Landmark: ${selectedAddress.landmark}`;

    addressLandmarkElement.hidden = false;
  } else {
    addressLandmarkElement.textContent = "";

    addressLandmarkElement.hidden = true;
  }

  refreshIcons();
}

// ======================================================
// ADDRESS SELECTOR
// ======================================================

function renderAddressOptions() {
  const addresses = getSavedAddresses();

  addressOptions.innerHTML = addresses
    .map((address) => {
      const selected = address.id === pendingAddressId;

      return `
          <label
            class="
              checkout-address-option
              ${selected ? "selected" : ""}
            "
            data-address-id="${address.id}"
          >
            <input
              type="radio"
              name="checkout-address"
              value="${address.id}"
              ${selected ? "checked" : ""}
            />

            <span
              class="checkout-address-option-radio"
            ></span>

            <span
              class="checkout-address-option-content"
            >
              <span
                class="checkout-address-option-heading"
              >
                <strong>
                  ${address.label}
                </strong>

                ${
                  address.isDefault
                    ? `
                      <span
                        class="
                          checkout-address-default-badge
                        "
                      >
                        Default
                      </span>
                    `
                    : ""
                }
              </span>

              <p>
                ${address.address}
              </p>

              ${
                address.landmark
                  ? `
                    <small>
                      Landmark:
                      ${address.landmark}
                    </small>
                  `
                  : ""
              }
            </span>
          </label>
        `;
    })
    .join("");
}

function openAddressSelector() {
  const addresses = getSavedAddresses();

  if (addresses.length === 0) {
    return;
  }

  pendingAddressId = selectedAddressId;

  renderAddressOptions();

  addressModal.hidden = false;

  addressModal.setAttribute("aria-hidden", "false");

  document.body.classList.add("checkout-modal-open");

  refreshIcons();
}

function closeAddressSelector() {
  addressModal.hidden = true;

  addressModal.setAttribute("aria-hidden", "true");

  document.body.classList.remove("checkout-modal-open");

  pendingAddressId = null;
}

function selectPendingAddress(addressId) {
  const addressExists = getSavedAddresses().some((address) => {
    return address.id === addressId;
  });

  if (!addressExists) {
    return;
  }

  pendingAddressId = addressId;

  renderAddressOptions();
}

function confirmSelectedAddress() {
  if (!pendingAddressId) {
    return;
  }

  selectedAddressId = pendingAddressId;

  closeAddressSelector();

  renderSelectedAddress();

  renderTotals();
}

// ======================================================
// CART HELPERS
// ======================================================

function getCartItemProduct(cartItem) {
  const productId = cartItem.productId ?? cartItem.id;

  return products.find((product) => {
    return product.id === productId;
  });
}

function getCartItemQuantity(cartItem) {
  return Number(cartItem.quantity) || 1;
}

function getSelectedVariants(cartItem) {
  return cartItem.selectedVariants ?? cartItem.variants ?? {};
}

function getProductBusiness(product) {
  if (!product) {
    return null;
  }

  return stores.find((store) => {
    return store.id === product.storeId;
  });
}

// ======================================================
// VALID CART ITEMS
// ======================================================

function getCheckoutItems() {
  return cart
    .map((cartItem, cartIndex) => {
      const product = getCartItemProduct(cartItem);

      if (!product) {
        return null;
      }

      const business = getProductBusiness(product);

      if (!business) {
        return null;
      }

      return {
        cartIndex,
        cartItem,
        product,
        business,

        quantity: getCartItemQuantity(cartItem),

        selectedVariants: getSelectedVariants(cartItem),
      };
    })
    .filter(Boolean);
}

// ======================================================
// GROUP ITEMS BY BUSINESS
// ======================================================

function getBusinessGroups() {
  const groups = new Map();

  getCheckoutItems().forEach((item) => {
    const businessId = item.business.id;

    if (!groups.has(businessId)) {
      groups.set(businessId, {
        business: item.business,

        items: [],
      });
    }

    groups.get(businessId).items.push(item);
  });

  return [...groups.values()];
}

// ======================================================
// VARIANTS
// ======================================================

function formatVariants(selectedVariants) {
  if (!selectedVariants || typeof selectedVariants !== "object") {
    return "";
  }

  const entries = Object.entries(selectedVariants);

  if (entries.length === 0) {
    return "";
  }

  return entries
    .map(([name, value]) => {
      return `${name}: ${value}`;
    })
    .join(" · ");
}

// ======================================================
// PRICE CALCULATIONS
// ======================================================

function calculateSubtotal() {
  return getCheckoutItems().reduce((total, item) => {
    return total + Number(item.product.price) * item.quantity;
  }, 0);
}

function calculateDeliveryFee() {
  const groups = getBusinessGroups();

  return groups.reduce((total, group) => {
    const fulfillment = fulfillmentSelections[group.business.id];

    if (fulfillment === "delivery") {
      const businessDeliveryFee = calculateBusinessDeliveryFee(
        group.business.distance,
      );

      return total + businessDeliveryFee;
    }

    return total;
  }, 0);
}

// ======================================================
// CUSTOMER SERVICE FEE
// ======================================================

function getServiceFeeRate(subtotal) {
  /*
    Customer-facing LocalLink service fee.

    Up to ₦20,000       → 2%
    ₦20,001–₦100,000    → 1.5%
    ₦100,001–₦500,000   → 1%
    Above ₦500,000      → 0.5%

    Maximum fee = ₦5,000.
  */

  if (subtotal <= 20000) {
    return 0.02;
  }

  if (subtotal <= 100000) {
    return 0.015;
  }

  if (subtotal <= 500000) {
    return 0.01;
  }

  return 0.005;
}

function calculateServiceFee(subtotal) {
  const rate = getServiceFeeRate(subtotal);

  const calculatedFee = subtotal * rate;

  return Math.min(Math.round(calculatedFee), 5000);
}

function getServiceFeePercentage(subtotal) {
  return getServiceFeeRate(subtotal) * 100;
}

function calculateCheckoutTotals() {
  const subtotal = calculateSubtotal();

  const deliveryFee = calculateDeliveryFee();

  const serviceFee = calculateServiceFee(subtotal);

  const total = subtotal + deliveryFee + serviceFee;

  return {
    subtotal,
    deliveryFee,
    serviceFee,
    total,
  };
}

// ======================================================
// SELLER COMMISSION
// ======================================================

function getSellerCommissionRate() {
  return 0.04;
}

// ======================================================
// FULFILLMENT INITIALIZATION
// ======================================================

function initializeFulfillmentSelections() {
  getBusinessGroups().forEach(({ business }) => {
    if (!fulfillmentSelections[business.id]) {
      fulfillmentSelections[business.id] = "delivery";
    }
  });
}

// ======================================================
// RENDER FULFILLMENT
// ======================================================

function renderFulfillmentOptions() {
  const groups = getBusinessGroups();

  fulfillmentList.innerHTML = groups
    .map(({ business }) => {
      const selected = fulfillmentSelections[business.id];

      return `
            <article
              class="
                checkout-fulfillment-business
              "
              data-business-id="${business.id}"
            >
              <div
                class="
                  checkout-fulfillment-business-heading
                "
              >
                <div
                  class="checkout-business-icon"
                >
                  <i
                    data-lucide="store"
                  ></i>
                </div>

                <div>
                  <strong>
                    ${business.name}
                  </strong>

                  <span>
                    Choose how to receive
                    these items
                  </span>
                </div>
              </div>

              <div
                class="
                  checkout-fulfillment-options
                "
              >
                <button
                  type="button"
                  class="checkout-fulfillment-option  ${selected === "delivery" ? "active" : ""}"
                  data-action="select-fulfillment"
                  data-business-id="${business.id}"
                  data-fulfillment="delivery"
                >
                  <i data-lucide="bike"></i>

                  <span>
                    <strong>
                      Delivery
                    </strong>

                    <small>
                      Deliver to your
                      address
                    </small>
                  </span>
                </button>

                <button
                  type="button"
                  class="
                    checkout-fulfillment-option
                    ${selected === "pickup" ? "active" : ""}
                  "
                  data-action="select-fulfillment"
                  data-business-id="${business.id}"
                  data-fulfillment="pickup"
                >
                  <i
                    data-lucide="shopping-bag"
                  ></i>

                  <span>
                    <strong>
                      Pickup
                    </strong>

                    <small>
                      Collect from the
                      business
                    </small>
                  </span>
                </button>
              </div>
            </article>
          `;
    })
    .join("");

  refreshIcons();
}

// ======================================================
// ADDRESS VISIBILITY
// ======================================================

function hasDeliveryOrder() {
  return Object.values(fulfillmentSelections).includes("delivery");
}

function updateAddressVisibility() {
  addressSection.hidden = !hasDeliveryOrder();
}

// ======================================================
// SUMMARY ITEMS
// ======================================================

function renderOrderSummary() {
  const groups = getBusinessGroups();

  summaryBusinesses.innerHTML = groups
    .map(({ business, items }) => {
      const itemsHTML = items
        .map((item) => {
          const variants = formatVariants(item.selectedVariants);

          return `
                  <div
                    class="
                      checkout-summary-item
                    "
                  >
                    <img
                      src="${item.product.image}"
                      alt="${item.product.name}"
                    />

                    <div
                      class="
                        checkout-summary-item-content
                      "
                    >
                      <strong>
                        ${item.product.name}
                      </strong>

                      ${
                        variants
                          ? `
                            <span>
                              ${variants}
                            </span>
                          `
                          : ""
                      }

                      <small>
                        Qty
                        ${item.quantity}
                      </small>
                    </div>

                    <strong
                      class="
                        checkout-summary-item-price
                      "
                    >
                      ${formatCurrency(
                        Number(item.product.price) * item.quantity,
                      )}
                    </strong>
                  </div>
                `;
        })
        .join("");

      return `
            <section
              class="
                checkout-summary-business
              "
            >
              <div
                class="
                  checkout-summary-business-heading
                "
              >
                <i
                  data-lucide="store"
                ></i>

                <strong>
                  ${business.name}
                </strong>
              </div>

              <div
                class="
                  checkout-summary-item-list
                "
              >
                ${itemsHTML}
              </div>
            </section>
          `;
    })
    .join("");

  refreshIcons();
}

// ======================================================
// TOTALS
// ======================================================

function renderTotals() {
  const { subtotal, deliveryFee, serviceFee, total } =
    calculateCheckoutTotals();

  subtotalElement.textContent = formatCurrency(subtotal);

  const allPickup = getBusinessGroups().every(({ business }) => {
    return fulfillmentSelections[business.id] === "pickup";
  });

  deliveryFeeElement.textContent = allPickup
    ? "—"
    : formatCurrency(deliveryFee);

  const percentage = getServiceFeePercentage(subtotal);

  serviceFeeElement.textContent = `${formatCurrency(
    serviceFee,
  )} (${percentage}%)`;

  totalElement.textContent = formatCurrency(total);

  paymentButtonLabel.textContent = `Pay ${formatCurrency(total)}`;
}

// ======================================================
// NOTE COUNT
// ======================================================

function updateNoteCount() {
  noteCount.textContent = noteInput.value.length;
}

// ======================================================
// CHECKOUT VALIDATION
// ======================================================

function validateCheckout() {
  if (!customerProfile) {
    window.alert("Your LocalLink profile could not be loaded.");

    return false;
  }

  const customerName = customerProfile.name?.trim();

  const customerPhone = customerProfile.phone?.trim();

  if (!customerName || !customerPhone) {
    window.alert("Complete your personal information before placing an order.");

    return false;
  }

  if (hasDeliveryOrder() && !getSelectedAddress()) {
    addressSection.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    return false;
  }

  return true;
}

// ======================================================
// PAYMENT METHOD
// ======================================================

function getSelectedPaymentMethod() {
  const selected = document.querySelector(
    'input[name="payment-method"]:checked',
  );

  return selected?.value ?? "card";
}

function updatePaymentOptionUI() {
  document.querySelectorAll(".checkout-payment-option").forEach((option) => {
    const radio = option.querySelector('input[type="radio"]');

    if (!radio) {
      return;
    }

    option.classList.toggle("active", radio.checked);
  });
}

// ======================================================
// ORDER CREATION
// ======================================================

function createSellerOrders(paymentTransactionId) {
  const existingOrders = loadOrders();

  const groups = getBusinessGroups();

  const selectedAddress = getSelectedAddress();

  const customer = {
    name: customerProfile.name,

    phone: customerProfile.phone,
  };

  const note = noteInput.value.trim();

  const createdAt = new Date().toISOString();

  const checkoutTotals = calculateCheckoutTotals();

  const totalSubtotal = checkoutTotals.subtotal;

  const newOrders = groups.map(({ business, items }) => {
    const fulfillment = fulfillmentSelections[business.id];

    const itemSubtotal = items.reduce((total, item) => {
      return total + Number(item.product.price) * item.quantity;
    }, 0);

    const deliveryFee =
      fulfillment === "delivery"
        ? calculateBusinessDeliveryFee(business.distance)
        : 0;

    const commissionRate = getSellerCommissionRate();

    const platformCommission = Math.round(itemSubtotal * commissionRate);

    const sellerSettlement = itemSubtotal - platformCommission;

    /*
          One checkout may create
          multiple seller orders.

          We distribute the customer
          service fee proportionally
          across those orders for
          record keeping.
        */

    const customerServiceFee =
      totalSubtotal > 0
        ? Math.round(checkoutTotals.serviceFee * (itemSubtotal / totalSubtotal))
        : 0;

    return {
      id: generateId("ORD"),

      type: "product",

      status: "payment-confirmed",

      createdAt,
      updatedAt: createdAt,

      businessId: business.id,

      business: {
        id: business.id,
        name: business.name,
      },

      customer,

      items: items.map((item) => {
        return {
          productId: item.product.id,

          name: item.product.name,

          image: item.product.image,

          price: Number(item.product.price),

          quantity: item.quantity,

          selectedVariants: item.selectedVariants,
        };
      }),

      fulfillment: {
        type: fulfillment,

        address:
          fulfillment === "delivery"
            ? (selectedAddress?.address ?? null)
            : null,

        addressId:
          fulfillment === "delivery" ? (selectedAddress?.id ?? null) : null,

        addressLabel:
          fulfillment === "delivery" ? (selectedAddress?.label ?? null) : null,

        landmark:
          fulfillment === "delivery"
            ? (selectedAddress?.landmark ?? null)
            : null,

        deliveryFee,
      },

      note: note || null,

      pricing: {
        itemsSubtotal: itemSubtotal,

        deliveryFee,

        customerServiceFee,
      },

      payment: {
        transactionId: paymentTransactionId,

        method: getSelectedPaymentMethod(),

        status: "paid",

        paidAt: createdAt,

        protectionStatus: "held",
      },

      settlement: {
        grossAmount: itemSubtotal,

        commissionRate,

        platformCommission,

        sellerAmount: sellerSettlement,

        status: "held",

        releasedAt: null,
      },

      timeline: [
        {
          status: "payment-confirmed",

          label: "Payment confirmed",

          timestamp: createdAt,
        },
      ],
    };
  });

  saveOrders([...newOrders, ...existingOrders]);

  return newOrders;
}

// ======================================================
// PAYMENT OVERLAY
// ======================================================

function createPaymentOverlay() {
  let overlay = document.querySelector("#checkout-payment-overlay");

  if (overlay) {
    return overlay;
  }

  overlay = document.createElement("div");

  overlay.id = "checkout-payment-overlay";

  overlay.className = "checkout-payment-overlay";

  overlay.innerHTML = `
    <div
      class="checkout-payment-modal"
    >
      <div
        class="
          checkout-payment-status-icon
        "
        id="payment-status-icon"
      >
        <span
          class="
            checkout-payment-spinner
          "
        ></span>
      </div>

      <span
        class="
          checkout-payment-status-label
        "
        id="payment-status-label"
      >
        Secure payment
      </span>

      <h2
        id="payment-status-title"
      >
        Securing your payment...
      </h2>

      <p id="payment-status-description">
        Please don't close this page
        while LocalLink prepares your
        transaction.
      </p>
    </div>
  `;

  document.body.append(overlay);

  return overlay;
}

function updatePaymentOverlay({ label, title, description, success = false }) {
  const overlay = createPaymentOverlay();

  const icon = overlay.querySelector("#payment-status-icon");

  const labelElement = overlay.querySelector("#payment-status-label");

  const titleElement = overlay.querySelector("#payment-status-title");

  const descriptionElement = overlay.querySelector(
    "#payment-status-description",
  );

  labelElement.textContent = label;

  titleElement.textContent = title;

  descriptionElement.textContent = description;

  if (success) {
    icon.classList.add("success");

    icon.innerHTML = `
      <i
        data-lucide="
          circle-check-big
        "
      ></i>
    `;

    refreshIcons();
  }
}

// ======================================================
// PAYMENT SIMULATION
// ======================================================

function wait(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

async function simulatePayment() {
  const { total } = calculateCheckoutTotals();

  const transactionId = generateId("PAY");

  createPaymentOverlay();

  document.body.classList.add("payment-processing");

  placeOrderButton.disabled = true;

  updatePaymentOverlay({
    label: "Secure payment",

    title: "Securing your payment...",

    description: `Preparing your ${formatCurrency(
      total,
    )} LocalLink transaction.`,
  });

  await wait(1000);

  updatePaymentOverlay({
    label: "Processing",

    title: "Processing transaction...",

    description: "Your payment is being securely processed.",
  });

  await wait(1300);

  updatePaymentOverlay({
    label: "Payment successful",

    title: `${formatCurrency(total)} paid successfully`,

    description:
      "Your payment is now protected by LocalLink while your order is fulfilled.",

    success: true,
  });

  await wait(1300);

  return transactionId;
}

// ======================================================
// CHECKOUT SUBMISSION
// ======================================================

async function handleCheckout() {
  if (!validateCheckout()) {
    return;
  }

  const transactionId = await simulatePayment();

  const orders = createSellerOrders(transactionId);

  /*
    Payment succeeded and the
    seller orders now exist.

    Only now do we clear the cart.
  */

  cart = [];

  saveCart(cart);

  updateCartCount();

  localStorage.setItem(
    "localLinkLastCheckout",
    JSON.stringify({
      transactionId,

      orderIds: orders.map((order) => {
        return order.id;
      }),

      createdAt: new Date().toISOString(),
    }),
  );

  window.location.href = "./order-confirmation.html";
}

// ======================================================
// FULFILLMENT ACTION
// ======================================================

function handleFulfillmentClick(event) {
  const button = event.target.closest('[data-action="select-fulfillment"]');

  if (!button) {
    return;
  }

  const businessId = button.dataset.businessId;

  const fulfillment = button.dataset.fulfillment;

  if (!businessId || !["delivery", "pickup"].includes(fulfillment)) {
    return;
  }

  fulfillmentSelections[businessId] = fulfillment;

  renderFulfillmentOptions();
  updateAddressVisibility();
  renderTotals();
}

// ======================================================
// ADDRESS ACTIONS
// ======================================================

function handleCheckoutAction(event) {
  const actionElement = event.target.closest("[data-action]");

  if (!actionElement) {
    return;
  }

  const action = actionElement.dataset.action;

  if (action === "change-address") {
    openAddressSelector();

    return;
  }

  if (action === "close-address-selector") {
    closeAddressSelector();

    return;
  }
}

function handleAddressOptionClick(event) {
  const option = event.target.closest("[data-address-id]");

  if (!option) {
    return;
  }

  selectPendingAddress(option.dataset.addressId);
}

// ======================================================
// EVENTS
// ======================================================

function attachEventListeners() {
  if (areCheckoutEventsAttached) {
    return;
  }

  fulfillmentList.addEventListener("click", handleFulfillmentClick);

  noteInput.addEventListener("input", updateNoteCount);

  document.querySelectorAll('input[name="payment-method"]').forEach((radio) => {
    radio.addEventListener("change", updatePaymentOptionUI);
  });

  document.addEventListener("click", handleCheckoutAction);

  addressOptions.addEventListener("click", handleAddressOptionClick);

  useAddressButton.addEventListener("click", confirmSelectedAddress);

  placeOrderButton.addEventListener("click", handleCheckout);

  areCheckoutEventsAttached = true;
}
// ======================================================
// ASYNC CHECKOUT STATES
// ======================================================

function renderCheckoutLoading() {
  emptyState.hidden = true;

  checkoutLayout.hidden = false;

  checkoutLayout.classList.add("checkout-is-loading");

  let loadingState = document.querySelector("#checkout-loading-state");

  if (!loadingState) {
    loadingState = document.createElement("div");

    loadingState.id = "checkout-loading-state";

    loadingState.className = "checkout-async-state checkout-loading-state";

    loadingState.innerHTML = `
      <span
        class="checkout-loading-spinner"
      ></span>

      <strong>
        Preparing your checkout...
      </strong>

      <p>
        Getting the latest product,
        business and pricing information.
      </p>
    `;

    checkoutLayout.append(loadingState);
  }

  placeOrderButton.disabled = true;
}

function hideCheckoutLoading() {
  document.querySelector("#checkout-loading-state")?.remove();

  checkoutLayout.classList.remove("checkout-is-loading");
}

function renderCheckoutError() {
  hideCheckoutLoading();

  emptyState.hidden = true;

  checkoutLayout.hidden = false;

  checkoutLayout.classList.add("checkout-is-loading");

  document.querySelector("#checkout-error-state")?.remove();

  const errorState = document.createElement("div");

  errorState.id = "checkout-error-state";

  errorState.className = "checkout-async-state checkout-error-state";

  errorState.innerHTML = `
    <i data-lucide="wifi-off"></i>

    <strong>
      Couldn't prepare checkout
    </strong>

    <p>
      We couldn't load the latest
      product and business information.
    </p>

    <button
      type="button"
      data-action="retry-checkout"
    >
      Try again
    </button>
  `;

  checkoutLayout.append(errorState);

  placeOrderButton.disabled = true;

  refreshIcons();
}

function hideCheckoutError() {
  document.querySelector("#checkout-error-state")?.remove();

  checkoutLayout.classList.remove("checkout-is-loading");
} // ======================================================
// EMPTY CHECKOUT
// ======================================================

function renderEmptyCheckout() {
  checkoutLayout.hidden = true;

  emptyState.hidden = false;

  refreshIcons();
}

document.addEventListener("click", (event) => {
  const retryButton = event.target.closest('[data-action="retry-checkout"]');

  if (!retryButton) {
    return;
  }

  loadCheckoutCatalogue();
});

// ======================================================
// LOAD CHECKOUT CATALOGUE
// ======================================================

async function loadCheckoutCatalogue() {
  if (isCheckoutLoading) {
    return;
  }

  isCheckoutLoading = true;

  hideCheckoutError();

  renderCheckoutLoading();

  try {
    const [loadedProducts, loadedStores] = await Promise.all([
      getProducts(),
      getStores(),
    ]);

    products = loadedProducts;

    stores = loadedStores;

    hideCheckoutLoading();

    initializeCheckoutContent();
  } catch (error) {
    console.error("Unable to prepare checkout:", error);

    renderCheckoutError();
  } finally {
    isCheckoutLoading = false;
  }
}

// ======================================================
// INITIALIZATION
// ======================================================

// ======================================================
// CHECKOUT CONTENT INITIALIZATION
// ======================================================

function initializeCheckoutContent() {
  const items = getCheckoutItems();

  if (items.length === 0) {
    renderEmptyCheckout();

    return;
  }

  checkoutLayout.hidden = false;

  emptyState.hidden = true;

  placeOrderButton.disabled = false;

  initializeCustomerProfile();

  initializeFulfillmentSelections();

  renderFulfillmentOptions();

  updateAddressVisibility();

  renderOrderSummary();

  renderTotals();

  updateNoteCount();

  updatePaymentOptionUI();

  attachEventListeners();

  refreshIcons();
}

// ======================================================
// INITIALIZATION
// ======================================================

function initializeCheckout() {
  initializeCartUI();

  if (cart.length === 0) {
    renderEmptyCheckout();

    return;
  }

  loadCheckoutCatalogue();
}

document.addEventListener("click", (event) => {
  const retryButton = event.target.closest('[data-action="retry-checkout"]');

  if (!retryButton) {
    return;
  }

  loadCheckoutCatalogue();
});

initializeCheckout();
