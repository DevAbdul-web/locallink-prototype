// ======================================================
// IMPORTS
// ======================================================

import { loadOrders } from "./storage.js";

import { initializeCartUI } from "./cart-ui.js";

import "./search.js";

// ======================================================
// DOM
// ======================================================

const confirmationContent = document.querySelector(
  "#order-confirmation-content",
);

const missingState = document.querySelector("#confirmation-missing");

const totalElement = document.querySelector("#confirmation-total");

const transactionElement = document.querySelector("#confirmation-transaction");

const orderCountElement = document.querySelector("#confirmation-order-count");

const ordersList = document.querySelector("#confirmation-orders-list");

// ======================================================
// HELPERS
// ======================================================

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function formatCurrency(value) {
  return `₦${Number(value).toLocaleString("en-NG")}`;
}

// NOTE TO LEARN LATER:
// This converts internal values such as
// "payment-confirmed" into customer-friendly text.

function formatStatus(status) {
  const statusLabels = {
    "payment-confirmed": "Payment confirmed",

    confirmed: "Order confirmed",

    preparing: "Preparing",

    "ready-for-delivery": "Ready for delivery",

    "rider-assigned": "Rider assigned",

    "out-for-delivery": "Out for delivery",

    "ready-for-pickup": "Ready for pickup",

    delivered: "Delivered",

    completed: "Completed",
  };

  return statusLabels[status] ?? status;
}

// ======================================================
// LAST CHECKOUT
// ======================================================

function loadLastCheckout() {
  try {
    const savedCheckout = localStorage.getItem("localLinkLastCheckout");

    return savedCheckout ? JSON.parse(savedCheckout) : null;
  } catch (error) {
    console.error("Could not load last checkout:", error);

    return null;
  }
}

// ======================================================
// FIND ORDERS CREATED BY THAT CHECKOUT
// ======================================================

function getCheckoutOrders(checkout) {
  const orders = loadOrders();

  return checkout.orderIds
    .map((orderId) => {
      return orders.find((order) => {
        return order.id === orderId;
      });
    })
    .filter(Boolean);
}

// NOTE TO LEARN LATER:
// map() transforms each order ID into an order object.
// find() finds the matching order.
// filter(Boolean) removes any missing/null result.

// ======================================================
// TOTAL PAID
// ======================================================

function calculatePaidTotal(orders) {
  return orders.reduce((total, order) => {
    return (
      total +
      Number(order.pricing.itemsSubtotal) +
      Number(order.pricing.deliveryFee) +
      Number(order.pricing.customerServiceFee)
    );
  }, 0);
}

// ======================================================
// RENDER ORDERS
// ======================================================

function renderOrders(orders) {
  ordersList.innerHTML = orders
    .map((order) => {
      const itemCount = order.items.reduce((total, item) => {
        return total + Number(item.quantity);
      }, 0);

      const fulfillment = order.fulfillment.type;

      const fulfillmentText =
        fulfillment === "delivery" ? "Delivery" : "Pickup";

      const locationText =
        fulfillment === "delivery"
          ? order.fulfillment.addressLabel ||
            order.fulfillment.address ||
            "Delivery address"
          : "Collect from business";

      return `
          <article
            class="confirmation-order-card"
          >
            <div
              class="confirmation-order-business"
            >
              <strong>
                ${order.business.name}
              </strong>

              <span>
                ${itemCount}
                ${itemCount === 1 ? "item" : "items"}
              </span>

              <div
                class="confirmation-order-meta"
              >
                <span>
                  <i
                    data-lucide="${
                      fulfillment === "delivery" ? "bike" : "shopping-bag"
                    }"
                  ></i>

                  ${fulfillmentText}
                </span>

                <span>
                  <i
                    data-lucide="map-pin"
                  ></i>

                  ${locationText}
                </span>
              </div>
            </div>

            <span
              class="confirmation-order-status"
            >
              ${formatStatus(order.status)}
            </span>
          </article>
        `;
    })
    .join("");

  refreshIcons();
}

// ======================================================
// EMPTY / INVALID STATE
// ======================================================

function showMissingState() {
  confirmationContent.hidden = true;

  missingState.hidden = false;

  refreshIcons();
}

// ======================================================
// INITIALIZE
// ======================================================

function initializeConfirmation() {
  initializeCartUI();

  const checkout = loadLastCheckout();

  if (
    !checkout ||
    !Array.isArray(checkout.orderIds) ||
    checkout.orderIds.length === 0
  ) {
    showMissingState();

    return;
  }

  const orders = getCheckoutOrders(checkout);

  if (orders.length === 0) {
    showMissingState();

    return;
  }

  const total = calculatePaidTotal(orders);

  transactionElement.textContent = checkout.transactionId;

  orderCountElement.textContent = orders.length;

  totalElement.textContent = formatCurrency(total);

  renderOrders(orders);

  confirmationContent.hidden = false;

  missingState.hidden = true;

  refreshIcons();
}

initializeConfirmation();
