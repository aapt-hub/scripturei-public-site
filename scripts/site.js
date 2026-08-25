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

const readerEdition = document.querySelector("#reader-edition");
const readerBook = document.querySelector("#reader-book");
const readerChapter = document.querySelector("#reader-chapter");
const readerMessage = document.querySelector("#reader-message");
const readerPassage = document.querySelector("#reader-passage");

const readerApiBase =
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "localhost"
    ? "http://127.0.0.1:8666"
    : "";

const setReaderMessage = (message) => {
  if (readerMessage) readerMessage.textContent = message;
};

const clearPassage = () => {
  if (readerPassage) readerPassage.replaceChildren();
};

const populateSelect = (select, items, getValue, getLabel, placeholder) => {
  select.replaceChildren();

  const first = document.createElement("option");
  first.value = "";
  first.textContent = placeholder;
  select.appendChild(first);

  for (const item of items) {
    const option = document.createElement("option");
    option.value = getValue(item);
    option.textContent = getLabel(item);
    select.appendChild(option);
  }

  select.disabled = false;
};

const loadEditions = async () => {
  if (!readerEdition) return;

  try {
    const response = await fetch(`${readerApiBase}/v1/reader/editions`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const editions = await response.json();

    populateSelect(
      readerEdition,
      editions,
      (edition) => edition.ID,
      (edition) => edition.Name,
      "Select edition"
    );

    setReaderMessage("Select an edition to begin.");
  } catch (error) {
    readerEdition.innerHTML =
      '<option value="">Reader unavailable</option>';

    readerEdition.disabled = true;

    setReaderMessage(
      "The Scripture reader service is currently unavailable."
    );

    console.error("Reader editions failed:", error);
  }
};

const loadBooks = async (editionID) => {
  readerBook.disabled = true;
  readerChapter.disabled = true;
  clearPassage();

  if (!editionID) {
    readerBook.innerHTML =
      '<option value="">Select edition first</option>';

    readerChapter.innerHTML =
      '<option value="">Select book first</option>';

    return;
  }

  setReaderMessage("Loading books…");

  const response = await fetch(
    `${readerApiBase}/v1/reader/books?edition=${encodeURIComponent(editionID)}`
  );

  if (!response.ok) {
    throw new Error(`Books HTTP ${response.status}`);
  }

  const books = await response.json();

  populateSelect(
    readerBook,
    books,
    (book) => book.Code,
    (book) => book.Name,
    "Select book"
  );

  readerChapter.innerHTML =
    '<option value="">Select book first</option>';

  setReaderMessage("Select a book.");
};

const loadChapters = async (editionID, bookCode) => {
  readerChapter.disabled = true;
  clearPassage();

  if (!editionID || !bookCode) return;

  setReaderMessage("Loading chapters…");

  const response = await fetch(
    `${readerApiBase}/v1/reader/chapters?edition=${encodeURIComponent(
      editionID
    )}&book=${encodeURIComponent(bookCode)}`
  );

  if (!response.ok) {
    throw new Error(`Chapters HTTP ${response.status}`);
  }

  const chapters = await response.json();

  populateSelect(
    readerChapter,
    chapters,
    (chapter) => String(chapter),
    (chapter) => String(chapter),
    "Select chapter"
  );

  setReaderMessage("Select a chapter.");
};

const loadPassage = async (editionID, bookCode, chapter) => {
  clearPassage();

  if (!editionID || !bookCode || !chapter) return;

  setReaderMessage("Loading Scripture…");

  const response = await fetch(
    `${readerApiBase}/v1/reader/passage?edition=${encodeURIComponent(
      editionID
    )}&book=${encodeURIComponent(
      bookCode
    )}&chapter=${encodeURIComponent(chapter)}`
  );

  if (!response.ok) {
    throw new Error(`Passage HTTP ${response.status}`);
  }

  const passage = await response.json();

  const heading = document.createElement("h4");
  heading.textContent = `${passage.BookCode} ${passage.Chapter}`;
  readerPassage.appendChild(heading);

  const verses = document.createElement("div");
  verses.className = "reader-verses";

  for (const verse of passage.Verses) {
    const paragraph = document.createElement("p");
    const number = document.createElement("sup");

    number.textContent = verse.Number;

    paragraph.appendChild(number);
    paragraph.append(" ");
    paragraph.append(verse.Text);

    verses.appendChild(paragraph);
  }

  readerPassage.appendChild(verses);

  readerPassage.dir =
    editionID === "hebwlc-ebible" ? "rtl" : "ltr";

  setReaderMessage("");
};

if (readerEdition && readerBook && readerChapter) {
  readerEdition.addEventListener("change", async () => {
    try {
      await loadBooks(readerEdition.value);
    } catch (error) {
      setReaderMessage("Unable to load books.");
      console.error(error);
    }
  });

  readerBook.addEventListener("change", async () => {
    try {
      await loadChapters(
        readerEdition.value,
        readerBook.value
      );
    } catch (error) {
      setReaderMessage("Unable to load chapters.");
      console.error(error);
    }
  });

  readerChapter.addEventListener("change", async () => {
    try {
      await loadPassage(
        readerEdition.value,
        readerBook.value,
        readerChapter.value
      );
    } catch (error) {
      setReaderMessage("Unable to load this chapter.");
      console.error(error);
    }
  });

  loadEditions();
}
