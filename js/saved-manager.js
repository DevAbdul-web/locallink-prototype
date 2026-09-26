const SAVED_STORAGE_KEY = "localLinkSavedItems";

export function getSavedItems() {
  const savedItems = localStorage.getItem(SAVED_STORAGE_KEY);

  return savedItems ? JSON.parse(savedItems) : [];
}

function persistSavedItems(savedItems) {
  localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(savedItems));
}

export function isSaved(type, id) {
  const savedItems = getSavedItems();

  return savedItems.some(
    (item) => item.type === type && Number(item.id) === Number(id),
  );
}

export function saveItem(type, id) {
  const savedItems = getSavedItems();

  if (isSaved(type, id)) {
    return;
  }

  savedItems.push({
    type,
    id: Number(id),
  });

  persistSavedItems(savedItems);
}

export function removeSavedItem(type, id) {
  const savedItems = getSavedItems();

  const updatedItems = savedItems.filter(
    (item) => !(item.type === type && Number(item.id) === Number(id)),
  );

  persistSavedItems(updatedItems);
}

export function toggleSavedItem(type, id) {
  if (isSaved(type, id)) {
    removeSavedItem(type, id);
    return false;
  }

  saveItem(type, id);
  return true;
}
