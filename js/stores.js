export const stores = document.querySelector("#stores");

// ------------------------------------------------------------
// STORE RENDERING
// ------------------------------------------------------------

export function renderStores(data) {
  const template = document.querySelector(".store-template");
  const fragment = document.createDocumentFragment();

  stores.replaceChildren();

  data.forEach((storeData) => {
    const store = template.content.cloneNode(true);
    store.querySelector(".store-image").src = storeData.image;
    store.querySelector(".store-image").alt = storeData.name;
    store.querySelector(".store-card").dataset.id = storeData.id;
    store.querySelector("h3").textContent = storeData.name;
    store.querySelector(".store-category").textContent = storeData.category;

    store.querySelector(".store-description").textContent =
      storeData.description;

    store.querySelector(".store-location").textContent = storeData.location;

    store.querySelector(".store-distance").textContent =
      storeData.distance + " km";

    store.querySelector(".store-rating").textContent =
      `${storeData.rating} (${storeData.reviewCount} reviews)`;

    if (storeData.isOpen) {
      store.querySelector(".store-status").textContent =
        `Open • Closes: ${storeData.closingTime}`;
    } else {
      store.querySelector(".store-status").textContent = "Closed";
    }

    fragment.append(store);
  });

  stores.append(fragment);
  window.lucide.createIcons();
}
