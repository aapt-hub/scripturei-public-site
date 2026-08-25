const toggle = document.querySelector(".nav-toggle");
const links = document.querySelector(".nav-links");

if (toggle && links) {
  const closeMenu = () => {
    links.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  };

  toggle.addEventListener("click", () => {
    const isOpen = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  links.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
}

const editionSelect = document.querySelector("[data-reader-edition]");
const editionName = document.querySelector("[data-reader-edition-name]");

const editionNames = {
  "kjv-1769": "King James Version 1769",
  hatbsa: "Haitian Creole Bible",
  "french-lsg-1910": "Louis Segond 1910",
};

editionSelect?.addEventListener("change", () => {
  if (editionName) editionName.textContent = editionNames[editionSelect.value] ?? "Approved Bible edition";
});
