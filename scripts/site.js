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

const readerLanguage = document.querySelector("#reader-language");
const readerEdition = document.querySelector("#reader-edition");
const readerBook = document.querySelector("#reader-book");
const readerChapter = document.querySelector("#reader-chapter");
const readerMessage = document.querySelector("#reader-message");
const readerPassage = document.querySelector("#reader-passage");
const readerFontDecrease = document.querySelector("[data-reader-font-decrease]");
const readerFontIncrease = document.querySelector("[data-reader-font-increase]");
const readerPrint = document.querySelector("[data-reader-print]");
const readerDownload = document.querySelector("[data-reader-download]");
const readerShare = document.querySelector("[data-reader-share]");

let currentPassage = null;
let readerFontScale = 1;

let readerEditions = [];

const languageNames = {
  arb: "Arabic",
  asm: "Assamese",
  ben: "Bengali",
  ceb: "Cebuano",
  ces: "Czech",
  ckb: "Central Kurdish",
  cmn: "Chinese Mandarin",
  deu: "German",
  eng: "English",
  ewe: "Ewe",
  fra: "French",
  gaz: "Oromo",
  grc: "Greek",
  guj: "Gujarati",
  hat: "Haitian Creole",
  hau: "Hausa",
  heb: "Hebrew",
  hbo: "Biblical Hebrew",
  hin: "Hindi",
  ibo: "Igbo",
  ind: "Indonesian",
  ita: "Italian",
  jav: "Javanese",
  kan: "Kannada",
  kor: "Korean",
  lin: "Lingala",
  mal: "Malayalam",
  mar: "Marathi",
  mya: "Burmese",
  npi: "Nepali",
  orm: "Oromo",
  pan: "Punjabi",
  pes: "Persian",
  por: "Portuguese",
  ron: "Romanian",
  rus: "Russian",
  sna: "Shona",
  spa: "Spanish",
  srp: "Serbian",
  swh: "Swahili",
  tam: "Tamil",
  tdx: "Tandroy",
  tel: "Telugu",
  tgl: "Tagalog",
  uig: "Uyghur",
  urd: "Urdu",
  vie: "Vietnamese",
  yor: "Yoruba",
};

const getEditionID = (edition) =>
  edition.ID ?? edition.id ?? edition.EditionID ?? edition.editionId ?? "";

const getEditionName = (edition) => {
  const id = getEditionID(edition);
  const name = edition.Name ?? edition.name ?? edition.DisplayName ?? edition.displayName ?? id;
  return name && name !== id ? name : id;
};

const getLanguageCode = (edition) =>
  edition.LanguageCode ?? edition.languageCode ?? getEditionID(edition).split("-")[0] ?? "";

const getLanguageName = (code) => languageNames[code] ?? code.toUpperCase();

const getLanguagesFromEditions = (editions) => {
  const codes = [...new Set(editions.map(getLanguageCode).filter(Boolean))];
  return codes
    .map((code) => ({ code, name: getLanguageName(code) }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

const populateEditionsForLanguage = (languageCode) => {
  const editions = readerEditions
    .filter((edition) => getLanguageCode(edition) === languageCode)
    .sort((a, b) => getEditionName(a).localeCompare(getEditionName(b)));

  populateSelect(
    readerEdition,
    editions,
    getEditionID,
    getEditionName,
    "Select Bible / Translation"
  );

  readerEdition.disabled = editions.length === 0;
};


const readerApiBase =
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "localhost"
    ? "http://127.0.0.1:8777"
    : "";

const setReaderMessage = (message) => {
  if (readerMessage) readerMessage.textContent = message;
};

const readerTools = [
  readerFontDecrease,
  readerFontIncrease,
  readerPrint,
  readerDownload,
  readerShare,
].filter(Boolean);

const setReaderToolsEnabled = (enabled) => {
  for (const tool of readerTools) tool.disabled = !enabled;
};

const clearPassage = () => {
  currentPassage = null;
  setReaderToolsEnabled(false);
  if (readerPassage) readerPassage.replaceChildren();
};

const applyReaderFontScale = () => {
  if (readerPassage) {
    readerPassage.style.setProperty("--reader-font-scale", String(readerFontScale));
  }
};

const passageAsText = () => {
  if (!currentPassage) return "";

  const heading = `${currentPassage.BookCode} ${currentPassage.Chapter}`;
  const verses = currentPassage.Verses
    .map((verse) => `${verse.Number} ${verse.Text}`)
    .join("\n");

  return `${heading}\n\n${verses}\n`;
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
  if (!readerLanguage || !readerEdition) return;

  try {
    const response = await fetch(`${readerApiBase}/v1/reader/editions`);

    if (!response.ok) {
      throw new Error(`Editions HTTP ${response.status}`);
    }

    readerEditions = await response.json();
    const languages = getLanguagesFromEditions(readerEditions);

    populateSelect(
      readerLanguage,
      languages,
      (language) => language.code,
      (language) => language.name,
      "Select language"
    );

    readerEdition.innerHTML =
      '<option value="">Select language first</option>';
    readerEdition.disabled = true;

    setReaderMessage("Select a language to begin.");
  } catch (error) {
    readerLanguage.innerHTML =
      '<option value="">Unable to load languages</option>';
    readerLanguage.disabled = true;
    readerEdition.innerHTML =
      '<option value="">Unable to load Bible / Translation</option>';
    readerEdition.disabled = true;
    readerBook.innerHTML =
      '<option value="">Select Bible / Translation first</option>';
    readerBook.disabled = true;
    readerChapter.innerHTML =
      '<option value="">Select book first</option>';
    readerChapter.disabled = true;
    console.error("Reader editions failed:", error);
    setReaderMessage("Unable to load Bible editions.");
  }
};

const loadBooks = async (editionID) => {
  readerBook.disabled = true;
  readerChapter.disabled = true;
  clearPassage();

  if (!editionID) {
    readerBook.innerHTML =
      '<option value="">Select Bible / Translation first</option>';

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

    const payload = await response.json();
    const passage = payload.passage ?? payload.Passage ?? payload;
    const versesPayload = passage.Verses ?? passage.verses ?? [];
    const citation = payload.citation ?? payload.Citation ?? null;

    currentPassage = payload;

  const heading = document.createElement("h4");
    heading.textContent = `${passage.BookCode ?? passage.bookCode} ${passage.Chapter ?? passage.chapter}`;
  readerPassage.appendChild(heading);

  const verses = document.createElement("div");
  verses.className = "reader-verses";

    for (const verse of versesPayload) {
    const paragraph = document.createElement("p");
    const number = document.createElement("sup");

    number.textContent = verse.Number;

    paragraph.appendChild(number);
    paragraph.append(" ");
    paragraph.append(verse.Text);

    verses.appendChild(paragraph);
  }

  readerPassage.appendChild(verses);

    if (citation) {
      const citationText =
        typeof citation === "string"
          ? citation
          : citation.passageReference ??
            citation.PassageReference ??
            citation.displayAttribution ??
            citation.DisplayAttribution ??
            "";

      if (citationText) {
        const citationParagraph = document.createElement("p");
        citationParagraph.className = "reader-citation";
        citationParagraph.textContent = citationText;
        readerPassage.appendChild(citationParagraph);
      }
    }

  readerPassage.dir =
    editionID === "hebwlc-ebible" ? "rtl" : "ltr";

  applyReaderFontScale();
  setReaderToolsEnabled(true);
  setReaderMessage("");
};

readerFontDecrease?.addEventListener("click", () => {
  readerFontScale = Math.max(0.85, Number((readerFontScale - 0.1).toFixed(2)));
  applyReaderFontScale();
});

readerFontIncrease?.addEventListener("click", () => {
  readerFontScale = Math.min(1.5, Number((readerFontScale + 0.1).toFixed(2)));
  applyReaderFontScale();
});

readerPrint?.addEventListener("click", () => {
  if (currentPassage) window.print();
});

readerDownload?.addEventListener("click", () => {
  if (!currentPassage) return;

  const blob = new Blob([passageAsText()], {
    type: "text/plain;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download =
    `${currentPassage.EditionID}-${currentPassage.BookCode}-${currentPassage.Chapter}.txt`;

  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
});

readerShare?.addEventListener("click", async () => {
  if (!currentPassage) return;

  const text = passageAsText();
  const title = `${currentPassage.BookCode} ${currentPassage.Chapter}`;

  try {
    if (navigator.share) {
      await navigator.share({ title, text });
      return;
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      setReaderMessage("Scripture copied to clipboard.");
      return;
    }

    setReaderMessage("Sharing is not available in this browser.");
  } catch (error) {
    if (error?.name !== "AbortError") {
      setReaderMessage("Unable to share this passage.");
      console.error(error);
    }
  }
});

if (readerLanguage && readerEdition && readerBook && readerChapter) {
  readerLanguage.addEventListener("change", () => {
    clearPassage();

    readerEdition.innerHTML =
      '<option value="">Select Bible / Translation</option>';
    readerBook.innerHTML =
      '<option value="">Select Bible / Translation first</option>';
    readerBook.disabled = true;
    readerChapter.innerHTML =
      '<option value="">Select book first</option>';
    readerChapter.disabled = true;
    setReaderToolsEnabled(false);

    if (!readerLanguage.value) {
      readerEdition.disabled = true;
      setReaderMessage("Select a language to begin.");
      return;
    }

    populateEditionsForLanguage(readerLanguage.value);
    setReaderMessage("Select a Bible / Translation.");
  });

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
