// ======================================================
// IMPORTS
// ======================================================

import { loadOrders, saveOrders } from "./storage.js";

// ======================================================
// DOM
// ======================================================

const liveArea = document.querySelector("#tracking-live-area");

const detailsArea = document.querySelector("#tracking-order-details");

const orderIdElement = document.querySelector("#tracking-order-id");

const notFound = document.querySelector("#tracking-not-found");

const confirmOverlay = document.querySelector("#tracking-confirm-overlay");

// ======================================================
// STATE
// ======================================================

let orders = loadOrders();

let currentOrder = null;

let transitionTimer = null;

let riderMovementTimer = null;

let riderProgress = 0;
// Actual amount of time we wait in the prototype.
const SIMULATED_JOURNEY_DURATION = 90 * 1000;

// What the customer sees in the UI.
const DISPLAYED_JOURNEY_MINUTES = 30;

const parameters = new URLSearchParams(window.location.search);

const orderId = parameters.get("id");

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

function getTotal(order) {
  return (
    Number(order.pricing?.itemsSubtotal || 0) +
    Number(order.pricing?.deliveryFee || 0) +
    Number(order.pricing?.customerServiceFee || 0)
  );
}

// ======================================================
// FIND ORDER
// ======================================================

function findCurrentOrder() {
  currentOrder = orders.find((order) => {
    return order.id === orderId;
  });
}

// ======================================================
// SAVE STATUS
// ======================================================

function calculateRiderProgress() {
  const tracking = currentOrder.deliveryTracking;

  if (!tracking) {
    return 0;
  }

  const now = Date.now();

  const journeyDuration = tracking.estimatedArrivalAt - tracking.startedAt;

  const elapsed = now - tracking.startedAt;

  const progress = (elapsed / journeyDuration) * 100;

  return Math.min(Math.max(progress, 0), 100);
}

function updateStatus(nextStatus, label) {
  const timestamp = new Date().toISOString();

  orders = orders.map((order) => {
    if (order.id !== currentOrder.id) {
      return order;
    }

    const updatedOrder = {
      ...order,

      status: nextStatus,

      updatedAt: timestamp,

      timeline: [
        ...(order.timeline || []),

        {
          status: nextStatus,
          label,
          timestamp,
        },
      ],
    };

    // When delivery actually begins,
    // persist the journey's source of truth.
    if (nextStatus === "out-for-delivery" && !order.deliveryTracking) {
      const startedAt = Date.now();

      updatedOrder.deliveryTracking = {
        startedAt,

        estimatedArrivalAt: startedAt + SIMULATED_JOURNEY_DURATION,
      };
    }

    return updatedOrder;
  });

  saveOrders(orders);

  findCurrentOrder();

  render();

  scheduleNextTransition();
}

function calculateDisplayedETA() {
  const remainingProgress = 100 - riderProgress;

  const minutes = Math.ceil(
    (remainingProgress / 100) * DISPLAYED_JOURNEY_MINUTES,
  );

  return Math.max(minutes, 1);
}

// ======================================================
// SIMULATED EXTERNAL EVENTS
// ======================================================

function getNextTransition() {
  const delivery = {
    "payment-confirmed": {
      status: "confirmed",

      label: "Business confirmed order",

      delay: 4000,
    },

    confirmed: {
      status: "preparing",

      label: "Business started preparing order",

      delay: 4500,
    },

    preparing: {
      status: "ready-for-delivery",

      label: "Order ready for delivery",

      delay: 5500,
    },

    "ready-for-delivery": {
      status: "rider-assigned",

      label: "Rider assigned",

      delay: 4500,
    },

    "rider-assigned": {
      status: "out-for-delivery",

      label: "Rider collected order",

      delay: 4500,
    },
  };

  const pickup = {
    "payment-confirmed": {
      status: "confirmed",

      label: "Business confirmed order",

      delay: 4000,
    },

    confirmed: {
      status: "preparing",

      label: "Business started preparing order",

      delay: 4500,
    },

    preparing: {
      status: "ready-for-pickup",

      label: "Order ready for pickup",

      delay: 6000,
    },

    "ready-for-pickup": {
      status: "awaiting-pickup",

      label: "Waiting for customer collection",

      delay: 3000,
    },
  };

  const transitions =
    currentOrder.fulfillment.type === "delivery" ? delivery : pickup;

  return transitions[currentOrder.status] || null;
}

function scheduleNextTransition() {
  window.clearTimeout(transitionTimer);

  const transition = getNextTransition();

  if (!transition) {
    return;
  }

  transitionTimer = window.setTimeout(
    () => {
      updateStatus(transition.status, transition.label);
    },

    transition.delay,
  );
}

// ======================================================
// SIMULATED LIVE RIDER MOVEMENT
// ======================================================

function startRiderMovement() {
  window.clearInterval(riderMovementTimer);

  if (currentOrder.status !== "out-for-delivery") {
    return;
  }

  // Immediately calculate where the rider
  // SHOULD be based on elapsed time.
  riderProgress = calculateRiderProgress();

  updateRiderPosition();

  // The interval no longer CREATES progress.
  // It only refreshes the UI from time.
  riderMovementTimer = window.setInterval(
    () => {
      riderProgress = calculateRiderProgress();

      updateRiderPosition();

      if (riderProgress >= 100) {
        window.clearInterval(riderMovementTimer);

        riderMovementTimer = null;

        updateStatus("arrived", "Rider arrived");
      }
    },

    500,
  );
}

function updateRiderPosition() {
  const rider = document.querySelector("#live-rider");

  const progressBar = document.querySelector("#live-route-progress");

  const eta = document.querySelector("#live-rider-eta");

  if (!rider || !progressBar || !eta) {
    return;
  }

  rider.style.left = `${riderProgress}%`;

  progressBar.style.width = `${riderProgress}%`;

  if (riderProgress >= 100) {
    eta.textContent = "Arrived";

    return;
  }

  const estimatedMinutes = calculateDisplayedETA();

  eta.textContent = `${estimatedMinutes} min`;
}

// ======================================================
// LIVE SCREEN CONTENT
// ======================================================

function getLiveContent() {
  const business = currentOrder.business.name;

  const screens = {
    "payment-confirmed": {
      icon: "shield-check",

      eyebrow: "Payment protected",

      title: "Waiting for the business",

      description: `${business} has received your order. We're waiting for them to confirm it.`,

      loading: "Waiting for confirmation",
    },

    confirmed: {
      icon: "circle-check",

      eyebrow: "Order confirmed",

      title: `${business} accepted your order`,

      description:
        "Your order has been confirmed and will begin preparation shortly.",

      loading: "Preparing next",
    },

    preparing: {
      icon: "package",

      eyebrow: "Preparing",

      title: "Your items are being prepared",

      description: `${business} is getting your order ready.`,

      loading: "Preparing your order",
    },

    "ready-for-delivery": {
      icon: "search",

      eyebrow: "Order ready",

      title: "Finding a nearby rider",

      description:
        "Your package is ready. LocalLink is matching it with an available rider.",

      loading: "Searching for rider",
    },

    "rider-assigned": {
      icon: "bike",

      eyebrow: "Rider found",

      title: "Ibrahim Musa is collecting your order",

      description:
        "Your LocalLink rider is heading to the business for pickup.",

      loading: "Rider heading to seller",
    },

    "out-for-delivery": {
      icon: "navigation",

      eyebrow: "Out for delivery",

      title: "Your order is on its way",

      description:
        "Ibrahim has collected your package and is heading towards you.",

      loading: null,
    },

    arrived: {
      icon: "map-pin",

      eyebrow: "Rider arrived",

      title: "Your order has arrived",

      description:
        "Please collect your items from the rider and check your order before confirming receipt.",

      loading: null,
    },

    "ready-for-pickup": {
      icon: "shopping-bag",

      eyebrow: "Ready for pickup",

      title: "Your order is ready",

      description: `${business} has finished preparing your items.`,

      loading: "Preparing collection",
    },

    "awaiting-pickup": {
      icon: "store",

      eyebrow: "Ready to collect",

      title: `Collect your order from ${business}`,

      description:
        "Once the business hands your items to you, confirm that you've received them.",

      loading: null,
    },

    completed: {
      icon: "package-check",

      eyebrow: "Completed",

      title: "Order delivered successfully",

      description:
        "Your order has been completed and the protected business settlement has been released.",

      loading: null,
    },
  };

  return screens[currentOrder.status] || screens["payment-confirmed"];
}

// ======================================================
// DELIVERY VISUAL
// ======================================================

function renderDeliveryJourney() {
  if (currentOrder.fulfillment.type !== "delivery") {
    return "";
  }

  const visibleStatuses = ["rider-assigned", "out-for-delivery", "arrived"];

  if (!visibleStatuses.includes(currentOrder.status)) {
    return "";
  }

  let progress = 5;

  if (currentOrder.status === "out-for-delivery") {
    progress = riderProgress || 12;
  }

  if (currentOrder.status === "arrived") {
    progress = 100;
  }

  const remainingPercentage = 100 - progress;

  const estimatedMinutes = Math.max(
    1,

    Math.ceil((remainingPercentage / 100) * DISPLAYED_JOURNEY_MINUTES),
  );

  let etaText = `${estimatedMinutes} min`;

  if (currentOrder.status === "rider-assigned") {
    etaText = "Collecting order";
  }

  if (currentOrder.status === "arrived") {
    etaText = "Arrived";
  }

  return `
    <div class="tracking-route">

      <div class="tracking-route-labels">

        <span>
          <i data-lucide="store"></i>

          ${currentOrder.business.name}
        </span>


        <span>
          <i data-lucide="house"></i>

          You
        </span>

      </div>


      <div class="tracking-route-line">

        <div
          id="live-route-progress"
          class="tracking-route-progress"
          style="width: ${progress}%"
        ></div>


        <span
          id="live-rider"
          class="tracking-rider"
          style="left: ${progress}%"
        >
          <i data-lucide="bike"></i>
        </span>

      </div>


      <div class="tracking-rider-card">

        <span>
          <i data-lucide="user"></i>
        </span>


        <div>
          <strong>
            Ibrahim Musa
          </strong>

          <small>
            LocalLink Rider • Honda
          </small>
        </div>


        <strong
          id="live-rider-eta"
          class="tracking-rider-eta"
        >
          ${etaText}
        </strong>

      </div>

    </div>
  `;
}
// ======================================================
// CUSTOMER ACTION
// ======================================================

function renderCustomerAction() {
  const canConfirm =
    currentOrder.status === "arrived" ||
    currentOrder.status === "awaiting-pickup";

  if (!canConfirm) {
    return "";
  }

  return `
    <button
      type="button"
      class="tracking-received-button"
      data-action="confirm-receipt"
    >
      <i data-lucide="package-check"></i>

      ${
        currentOrder.fulfillment.type === "delivery"
          ? "Confirm I've received it"
          : "Confirm I've collected it"
      }
    </button>
  `;
}

// ======================================================
// RENDER LIVE AREA
// ======================================================

function renderLiveArea() {
  const content = getLiveContent();

  liveArea.innerHTML = `
    <div class="tracking-status-visual">

      <span class="tracking-main-icon">
        <i data-lucide="${content.icon}"></i>
      </span>

      <span class="tracking-eyebrow">
        ${content.eyebrow}
      </span>

      <h1>
        ${content.title}
      </h1>

      <p>
        ${content.description}
      </p>


      ${
        content.loading
          ? `
            <div class="tracking-live-loading">

              <span></span>

              ${content.loading}

            </div>
          `
          : ""
      }

    </div>


    ${renderDeliveryJourney()}

    ${renderCustomerAction()}
  `;
}

// ======================================================
// ORDER DETAILS
// ======================================================

function renderOrderDetails() {
  const items = currentOrder.items
    .map((item) => {
      return `
            <div class="tracking-item">

              <img
                src="${item.image}"
                alt="${item.name}"
              />

              <div>
                <strong>
                  ${item.name}
                </strong>

                <span>
                  Qty ${item.quantity}
                </span>
              </div>

              <strong>
                ${formatCurrency(Number(item.price) * Number(item.quantity))}
              </strong>

            </div>
          `;
    })
    .join("");

  detailsArea.innerHTML = `
    <div class="tracking-detail-heading">

      <div>
        <span>Order from</span>

        <strong>
          ${currentOrder.business.name}
        </strong>
      </div>

      <span>
        ${currentOrder.fulfillment.type === "delivery" ? "Delivery" : "Pickup"}
      </span>

    </div>


    <div class="tracking-items">
      ${items}
    </div>


    <div class="tracking-total">

      <span>
        Total paid
      </span>

      <strong>
        ${formatCurrency(getTotal(currentOrder))}
      </strong>

    </div>


    <div class="tracking-payment-protection">

      <i data-lucide="shield-check"></i>

      <div>
        <strong>
          ${
            currentOrder.status === "completed"
              ? "Payment completed"
              : "Payment protected"
          }
        </strong>

        <span>
          ${
            currentOrder.status === "completed"
              ? "The order was completed and the business settlement was released."
              : "LocalLink is protecting your payment while this order is fulfilled."
          }
        </span>
      </div>

    </div>
  `;
}

// ======================================================
// COMPLETE ORDER
// ======================================================

function completeOrder() {
  const timestamp = new Date().toISOString();

  orders = orders.map((order) => {
    if (order.id !== currentOrder.id) {
      return order;
    }

    return {
      ...order,

      status: "completed",

      completedAt: timestamp,

      updatedAt: timestamp,

      timeline: [
        ...(order.timeline || []),

        {
          status: "completed",

          label: "Customer confirmed receipt",

          timestamp,
        },
      ],

      payment: {
        ...order.payment,

        protectionStatus: "released",
      },

      settlement: {
        ...order.settlement,

        status: "released",

        releasedAt: timestamp,
      },
    };
  });

  saveOrders(orders);

  findCurrentOrder();

  closeConfirmModal();

  render();
}

function reconcileDeliveryTracking() {
  if (
    currentOrder.status !== "out-for-delivery" ||
    !currentOrder.deliveryTracking
  ) {
    return false;
  }

  if (Date.now() < currentOrder.deliveryTracking.estimatedArrivalAt) {
    return false;
  }

  updateStatus("arrived", "Rider arrived");

  return true;
}

// ======================================================
// MODAL
// ======================================================

function openConfirmModal() {
  confirmOverlay.hidden = false;

  refreshIcons();
}

function closeConfirmModal() {
  confirmOverlay.hidden = true;
}

// ======================================================
// EVENTS
// ======================================================

function handleActions(event) {
  const actionElement = event.target.closest("[data-action]");

  if (!actionElement) {
    return;
  }

  const action = actionElement.dataset.action;

  if (action === "confirm-receipt") {
    openConfirmModal();

    return;
  }

  if (action === "cancel-receipt") {
    closeConfirmModal();

    return;
  }

  if (action === "complete-order") {
    completeOrder();
  }
}

// ======================================================
// RENDER
// ======================================================

function render() {
  orderIdElement.textContent = currentOrder.id;

  renderLiveArea();

  renderOrderDetails();

  refreshIcons();

  if (currentOrder.status === "out-for-delivery") {
    startRiderMovement();
  }
}

// ======================================================
// INITIALIZE
// ======================================================

function initializeTracking() {
  findCurrentOrder();

  if (!currentOrder) {
    liveArea.hidden = true;
    detailsArea.hidden = true;
    notFound.hidden = false;

    refreshIcons();

    return;
  }

  const stateChanged = reconcileDeliveryTracking();

  if (!stateChanged) {
    render();
    scheduleNextTransition();
  }

  document.addEventListener("click", handleActions);
}

initializeTracking();
