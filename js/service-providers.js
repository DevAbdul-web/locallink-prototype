export const serviceProviders = document.querySelector("#service-providers");

// ------------------------------------------------------------
// SERVICE PROVIDER RENDERING
// ------------------------------------------------------------

export function renderServiceProviders(data) {
  const template = document.querySelector(".service-provider-template");
  const fragment = document.createDocumentFragment();

  serviceProviders.replaceChildren();

  data.forEach((serviceProviderData) => {
    const serviceProvider = template.content.cloneNode(true);

    serviceProvider.querySelector(".provider-image").src =
      serviceProviderData.image;
    serviceProvider.querySelector(".provider-image").alt =
      serviceProviderData.name;
    serviceProvider.querySelector(".service-provider-card").dataset.id =
      serviceProviderData.id;

    serviceProvider.querySelector("h3").textContent = serviceProviderData.name;

    serviceProvider.querySelector(".provider-category").textContent =
      serviceProviderData.category;

    serviceProvider.querySelector(".provider-description").textContent =
      serviceProviderData.description;

    serviceProvider.querySelector(".provider-location").textContent =
      serviceProviderData.location;

    serviceProvider.querySelector(".provider-distance").textContent =
      serviceProviderData.distance + " km";

    serviceProvider.querySelector(".provider-rating").textContent =
      `${serviceProviderData.rating} (${serviceProviderData.reviewCount} reviews)`;

    if (serviceProviderData.isAvailable) {
      serviceProvider.querySelector(".provider-status").textContent =
        `Open • Closes: ${serviceProviderData.closingTime}`;
    } else {
      serviceProvider.querySelector(".provider-status").textContent = "Closed";
    }

    fragment.append(serviceProvider);
  });

  serviceProviders.append(fragment);
  window.lucide.createIcons();
}
