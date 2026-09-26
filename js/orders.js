// ======================================================
// IMPORTS
// ======================================================

import { loadOrders, loadServiceRequests } from "./storage.js";

import { initializeCartUI } from "./cart-ui.js";

import "./search.js";

// ======================================================
// DOM
// ======================================================

const ordersList = document.querySelector("#orders-list");

const ordersTabs = document.querySelector("#orders-tabs");

const activityTypeTabs = document.querySelector("#activity-type-tabs");

const emptyState = document.querySelector("#orders-empty");

const emptyTitle = document.querySelector("#orders-empty-title");

const emptyText = document.querySelector("#orders-empty-text");

const activeCount = document.querySelector("#active-orders-count");

const completedCount = document.querySelector("#completed-orders-count");

// ======================================================
// STATE
// ======================================================

let orders = loadOrders();

let serviceRequests = loadServiceRequests();

let currentActivityType = "order";

let currentFilter = "active";

// ======================================================
// GENERAL HELPERS
// ======================================================

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function formatCurrency(value) {
  return `₦${Number(value || 0).toLocaleString("en-NG")}`;
}

function formatDate(dateString) {
  if (!dateString) {
    return "Recently";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

// ======================================================
// PRODUCT ORDER HELPERS
// ======================================================

function getOrderTotal(order) {
  return (
    Number(order.pricing?.itemsSubtotal || 0) +
    Number(order.pricing?.deliveryFee || 0) +
    Number(order.pricing?.customerServiceFee || 0)
  );
}

function getItemCount(order) {
  return order.items.reduce((total, item) => {
    return total + Number(item.quantity);
  }, 0);
}

function isOrderCompleted(order) {
  return order.status === "completed";
}

// ======================================================
// SERVICE HELPERS
// ======================================================

function isServiceCompleted(request) {
  return request.status === "completed";
}

function getServiceName(request) {
  return (
    request.service?.name ||
    request.serviceName ||
    request.name ||
    "Service request"
  );
}

function getProviderName(request) {
  return (
    request.provider?.name ||
    request.providerName ||
    request.business?.name ||
    "Local service provider"
  );
}

function getServiceImage(request) {
  return request.service?.image || request.serviceImage || request.image || "";
}

function getServicePrice(request) {
  return (
    request.payment?.amount ||
    request.quote?.total ||
    request.quote?.amount ||
    request.total ||
    request.price ||
    request.service?.price ||
    0
  );
}

function getServiceCreatedAt(request) {
  return request.createdAt || request.requestedAt || request.updatedAt;
}

function getServiceFulfillment(request) {
  const fulfillment =
    request.fulfillment?.type ||
    request.fulfillment ||
    request.serviceMethod ||
    request.method;

  if (fulfillment === "remote") {
    return {
      label: "Remote",
      icon: "video",
    };
  }

  if (
    fulfillment === "provider-visit" ||
    fulfillment === "home-service" ||
    fulfillment === "home"
  ) {
    return {
      label: "Home service",
      icon: "house",
    };
  }

  if (fulfillment === "customer-visit" || fulfillment === "provider-location") {
    return {
      label: "Visit provider",
      icon: "store",
    };
  }

  return {
    label: "Service",
    icon: "briefcase-business",
  };
}

// ======================================================
// PRODUCT ORDER STATUS
// ======================================================

function getOrderStatusInformation(order) {
  const businessName = order.business?.name || "The business";

  const statuses = {
    "payment-confirmed": {
      label: "Payment confirmed",

      description: "Waiting for the business to confirm your order.",

      icon: "shield-check",
    },

    confirmed: {
      label: "Order confirmed",

      description: `${businessName} has accepted your order.`,

      icon: "circle-check",
    },

    preparing: {
      label: "Preparing your order",

      description: `${businessName} is preparing your items.`,

      icon: "package",
    },

    "ready-for-delivery": {
      label: "Finding a rider",

      description: "Your order is ready and we're finding a nearby rider.",

      icon: "search",
    },

    "rider-assigned": {
      label: "Rider assigned",

      description: "A LocalLink rider is collecting your order.",

      icon: "bike",
    },

    "out-for-delivery": {
      label: "Out for delivery",

      description: "Your order is on its way to you.",

      icon: "navigation",
    },

    arrived: {
      label: "Rider has arrived",

      description: "Receive your items and confirm delivery.",

      icon: "map-pin",
    },

    "ready-for-pickup": {
      label: "Ready for pickup",

      description: "Your items are ready at the business.",

      icon: "shopping-bag",
    },

    "awaiting-pickup": {
      label: "Ready to collect",

      description: "Collect your order and confirm receipt.",

      icon: "store",
    },

    completed: {
      label: "Delivered",

      description: "This order has been completed.",

      icon: "package-check",
    },
  };

  return statuses[order.status] || statuses["payment-confirmed"];
}

// ======================================================
// SERVICE STATUS
// ======================================================

function getServiceStatusInformation(request) {
  const providerName = getProviderName(request);

  const statuses = {
    pending: {
      label: "Request sent",

      description: "Waiting for the provider to review your request.",

      icon: "clock-3",
    },

    accepted: {
      label: "Request accepted",

      description: `${providerName} has accepted your request.`,

      icon: "circle-check",
    },

    "awaiting-payment": {
      label: "Payment required",

      description: "Your service quote is ready for payment.",

      icon: "credit-card",
    },

    scheduled: {
      label: "Service scheduled",

      description: "Your service has been scheduled.",

      icon: "calendar-check",
    },

    "provider-preparing": {
      label: "Provider preparing",

      description: `${providerName} is preparing for your service.`,

      icon: "briefcase-business",
    },

    "on-the-way": {
      label: "Provider on the way",

      description: `${providerName} is on the way to your location.`,

      icon: "navigation",
    },

    arrived: {
      label: "Provider arrived",

      description: "Your provider has arrived for the service.",

      icon: "map-pin",
    },

    "in-progress": {
      label: "Service in progress",

      description: "Your service is currently being carried out.",

      icon: "wrench",
    },

    "awaiting-customer-confirmation": {
      label: "Confirm completion",

      description:
        "The provider has finished. Confirm once the service is complete.",

      icon: "circle-help",
    },

    "awaiting-provider-verification": {
      label: "Verifying completion",

      description:
        "Your confirmation was received and completion is being verified.",

      icon: "shield-check",
    },

    completed: {
      label: "Service completed",

      description: "This service has been completed.",

      icon: "badge-check",
    },
  };

  return statuses[request.status] || statuses.pending;
}

// ======================================================
// CURRENT ACTIVITY COLLECTION
// ======================================================

function getCurrentActivities() {
  if (currentActivityType === "service") {
    return serviceRequests;
  }

  return orders;
}

// ======================================================
// COMPLETION CHECK
// ======================================================

function isCurrentActivityCompleted(activity) {
  if (currentActivityType === "service") {
    return isServiceCompleted(activity);
  }

  return isOrderCompleted(activity);
}

// ======================================================
// FILTER ACTIVITIES
// ======================================================

function getFilteredActivities() {
  const activities = getCurrentActivities();

  const filtered = activities.filter((activity) => {
    const completed = isCurrentActivityCompleted(activity);

    if (currentFilter === "completed") {
      return completed;
    }

    return !completed;
  });

  return filtered.sort((a, b) => {
    const dateA =
      currentActivityType === "service" ? getServiceCreatedAt(a) : a.createdAt;

    const dateB =
      currentActivityType === "service" ? getServiceCreatedAt(b) : b.createdAt;

    return new Date(dateB || 0).getTime() - new Date(dateA || 0).getTime();
  });
}

// ======================================================
// COUNTS
// ======================================================

function renderCounts() {
  const activities = getCurrentActivities();

  const completed = activities.filter((activity) =>
    isCurrentActivityCompleted(activity),
  ).length;

  const active = activities.length - completed;

  activeCount.textContent = active;

  completedCount.textContent = completed;
}

// ======================================================
// RENDER PRODUCT ORDER
// ======================================================

function renderOrder(order) {
  const status = getOrderStatusInformation(order);

  const itemCount = getItemCount(order);

  const firstItem = order.items[0];

  const extraItems = itemCount - Number(firstItem?.quantity || 0);

  const fulfillment =
    order.fulfillment?.type === "delivery" ? "Delivery" : "Pickup";

  const businessName = order.business?.name || "Local business";

  return `
    <article
      class="
        customer-order-card
        customer-activity-card
        product-order-card
      "
    >

      <div class="customer-order-top">

        <div
          class="customer-order-business"
        >

          <span
            class="
              customer-order-store-icon
              product-activity-icon
            "
          >
            <i data-lucide="store"></i>
          </span>


          <div>

            <div
              class="activity-type-label"
            >
              Product order
            </div>

            <strong>
              ${businessName}
            </strong>

            <span>
              ${formatDate(order.createdAt)}
            </span>

          </div>

        </div>


        <span
          class="customer-order-id"
        >
          ${order.id}
        </span>

      </div>


      <div
        class="customer-order-product"
      >

        ${
          firstItem?.image
            ? `
              <img
                src="${firstItem.image}"
                alt="${firstItem.name}"
              />
            `
            : `
              <div
                class="
                  customer-order-placeholder
                "
              >
                <i data-lucide="package"></i>
              </div>
            `
        }


        <div>

          <strong>
            ${firstItem?.name || "Order"}
          </strong>

          <span>
            ${
              extraItems > 0
                ? `+ ${extraItems} more item${extraItems === 1 ? "" : "s"}`
                : `${itemCount} item${itemCount === 1 ? "" : "s"}`
            }
          </span>

        </div>


        <strong
          class="customer-order-price"
        >
          ${formatCurrency(getOrderTotal(order))}
        </strong>

      </div>


      <div
        class="
          customer-order-live-status
        "
      >

        <span
          class="
            customer-order-status-icon
          "
        >
          <i
            data-lucide="${status.icon}"
          ></i>
        </span>


        <div>

          <strong>
            ${status.label}
          </strong>

          <span>
            ${status.description}
          </span>

        </div>

      </div>


      <div
        class="customer-order-footer"
      >

        <span>

          <i
            data-lucide="${
              fulfillment === "Delivery" ? "bike" : "shopping-bag"
            }"
          ></i>

          ${fulfillment}

        </span>


        <a
          href="./order-tracking.html?id=${encodeURIComponent(order.id)}"
        >

          ${isOrderCompleted(order) ? "View order" : "Track order"}

          <i
            data-lucide="arrow-right"
          ></i>

        </a>

      </div>

    </article>
  `;
}

// ======================================================
// RENDER SERVICE REQUEST
// ======================================================

function renderServiceRequest(request) {
  const status = getServiceStatusInformation(request);

  const serviceName = getServiceName(request);

  const providerName = getProviderName(request);

  const serviceImage = getServiceImage(request);

  const servicePrice = getServicePrice(request);

  const fulfillment = getServiceFulfillment(request);

  return `
    <article
      class="
        customer-order-card
        customer-activity-card
        service-request-card
      "
    >

      <div class="customer-order-top">

        <div
          class="customer-order-business"
        >

          <span
            class="
              customer-order-store-icon
              service-activity-icon
            "
          >
            <i
              data-lucide="briefcase-business"
            ></i>
          </span>


          <div>

            <div
              class="activity-type-label"
            >
              Service request
            </div>

            <strong>
              ${providerName}
            </strong>

            <span>
              ${formatDate(getServiceCreatedAt(request))}
            </span>

          </div>

        </div>


        <span
          class="customer-order-id"
        >
          ${request.id}
        </span>

      </div>


      <div
        class="customer-order-product"
      >

        ${
          serviceImage
            ? `
              <img
                src="${serviceImage}"
                alt="${serviceName}"
              />
            `
            : `
              <div
                class="
                  customer-order-placeholder
                  service-placeholder
                "
              >
                <i data-lucide="wrench"></i>
              </div>
            `
        }


        <div>

          <strong>
            ${serviceName}
          </strong>

          <span>
            Service request
          </span>

        </div>


        ${
          servicePrice
            ? `
              <strong
                class="
                  customer-order-price
                "
              >
                ${formatCurrency(servicePrice)}
              </strong>
            `
            : ""
        }

      </div>


      <div
        class="
          customer-order-live-status
          service-live-status
        "
      >

        <span
          class="
            customer-order-status-icon
          "
        >
          <i
            data-lucide="${status.icon}"
          ></i>
        </span>


        <div>

          <strong>
            ${status.label}
          </strong>

          <span>
            ${status.description}
          </span>

        </div>

      </div>


      <div
        class="customer-order-footer"
      >

        <span>

          <i
            data-lucide="${fulfillment.icon}"
          ></i>

          ${fulfillment.label}

        </span>


        <a
          href="./service-tracking.html?id=${encodeURIComponent(request.id)}"
        >

          ${isServiceCompleted(request) ? "View service" : "Track service"}

          <i
            data-lucide="arrow-right"
          ></i>

        </a>

      </div>

    </article>
  `;
}

// ======================================================
// EMPTY STATE
// ======================================================

function showEmptyState() {
  emptyState.hidden = false;

  if (currentActivityType === "service") {
    if (currentFilter === "completed") {
      emptyTitle.textContent = "No completed services";

      emptyText.textContent = "Services you've completed will appear here.";

      return;
    }

    emptyTitle.textContent = "No active services";

    emptyText.textContent = "Your current service requests will appear here.";

    return;
  }

  if (currentFilter === "completed") {
    emptyTitle.textContent = "No completed orders";

    emptyText.textContent = "Orders you've received will appear here.";

    return;
  }

  emptyTitle.textContent = "No active orders";

  emptyText.textContent =
    "Orders you're currently waiting for will appear here.";
}

// ======================================================
// RENDER
// ======================================================

function renderActivities() {
  const activities = getFilteredActivities();

  renderCounts();

  if (activities.length === 0) {
    ordersList.innerHTML = "";

    showEmptyState();

    refreshIcons();

    return;
  }

  emptyState.hidden = true;

  if (currentActivityType === "service") {
    ordersList.innerHTML = activities.map(renderServiceRequest).join("");
  } else {
    ordersList.innerHTML = activities.map(renderOrder).join("");
  }

  refreshIcons();
}

// ======================================================
// STATUS FILTER
// ======================================================

function handleStatusFilter(event) {
  const button = event.target.closest("[data-filter]");

  if (!button) {
    return;
  }

  currentFilter = button.dataset.filter;

  ordersTabs.querySelectorAll("[data-filter]").forEach((tab) => {
    tab.classList.toggle("active", tab === button);
  });

  renderActivities();
}

// ======================================================
// ACTIVITY TYPE FILTER
// ======================================================

function handleActivityType(event) {
  const button = event.target.closest("[data-activity-type]");

  if (!button) {
    return;
  }

  currentActivityType = button.dataset.activityType;

  activityTypeTabs.querySelectorAll("[data-activity-type]").forEach((tab) => {
    tab.classList.toggle("active", tab === button);
  });

  renderActivities();
}

// ======================================================
// INITIALIZE
// ======================================================

function initializeOrders() {
  initializeCartUI();

  ordersTabs.addEventListener("click", handleStatusFilter);

  activityTypeTabs.addEventListener("click", handleActivityType);

  renderActivities();

  refreshIcons();
}

initializeOrders();
