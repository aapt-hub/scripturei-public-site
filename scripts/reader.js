(() => {
  const reader = document.querySelector('[data-reader]');
  const openButtons = document.querySelectorAll('[data-reader-open]');
  const closeButtons = document.querySelectorAll('[data-reader-close]');

  if (!reader) return;

  const openReader = () => {
    reader.hidden = false;
    document.body.classList.add('reader-open');
  };

  const closeReader = () => {
    reader.hidden = true;
    document.body.classList.remove('reader-open');
  };

  openButtons.forEach((button) => button.addEventListener('click', openReader));
  closeButtons.forEach((button) => button.addEventListener('click', closeReader));
})();
