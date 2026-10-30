(() => {
  'use strict';
  const basePrices = { '2': 8000, '3': 10000, '4': 14000 };
  const titles = { '2': 'Яркий старт (2 часа)', '3': 'Любимый праздник (3 часа)', '4': 'Максимум веселья (4 часа)' };
  const rub = value => new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
  const $ = id => document.getElementById(id);
  const clampGuests = value => Math.min(100, Math.max(1, Number.isFinite(Number(value)) ? Math.round(Number(value)) : 15));

  // Mobile navigation
  const toggle = $('menu-toggle');
  const nav = $('main-nav');
  if (toggle && nav) {
    const closeMenu = () => { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', 'Открыть меню'); };
    toggle.addEventListener('click', () => { const opened = nav.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(opened)); toggle.setAttribute('aria-label', opened ? 'Закрыть меню' : 'Открыть меню'); });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
    document.addEventListener('click', event => { if (!nav.contains(event.target) && !toggle.contains(event.target)) closeMenu(); });
  }

  // Activity filters
  const filters = [...document.querySelectorAll('[data-filter]')];
  const activityCards = [...document.querySelectorAll('[data-category]')];
  filters.forEach(button => button.addEventListener('click', () => {
    const category = button.dataset.filter;
    filters.forEach(item => { const selected = item === button; item.classList.toggle('active', selected); item.setAttribute('aria-pressed', String(selected)); });
    activityCards.forEach(card => { card.hidden = category !== 'all' && card.dataset.category !== category; });
  }));

  // Transparent, browser-only price calculation
  const calcPackage = $('calc-package');
  const guestsInput = $('calc-guests');
  const facepaintInput = $('calc-facepaint');
  const updateCalculation = () => {
    const pkg = calcPackage.value;
    const guests = clampGuests(guestsInput.value);
    const extraGuests = Math.max(0, guests - 15);
    const extraPrice = extraGuests * 350;
    const paintPrice = facepaintInput.checked ? 1000 + extraGuests * 100 : 0;
    $('base-price').textContent = rub(basePrices[pkg]);
    $('guests-extra').textContent = rub(extraPrice);
    $('facepaint-row').hidden = !facepaintInput.checked;
    $('facepaint-price').textContent = rub(paintPrice);
    $('total-price').textContent = rub(basePrices[pkg] + extraPrice + paintPrice);
  };
  ['input', 'change'].forEach(type => { calcPackage.addEventListener(type, updateCalculation); guestsInput.addEventListener(type, updateCalculation); facepaintInput.addEventListener(type, updateCalculation); });
  guestsInput.addEventListener('blur', () => { guestsInput.value = clampGuests(guestsInput.value); updateCalculation(); });
  $('guests-minus').addEventListener('click', () => { guestsInput.value = Math.max(1, clampGuests(guestsInput.value) - 1); updateCalculation(); });
  $('guests-plus').addEventListener('click', () => { guestsInput.value = Math.min(100, clampGuests(guestsInput.value) + 1); updateCalculation(); });
  updateCalculation();

  // Privacy-first booking: prepare data locally, then user explicitly sends via VK or SMS.
  const booking = $('booking-dialog');
  const form = $('booking-form');
  const bookingStatus = $('copy-status');
  const localDateString = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const bookPhone = $('book-phone');
  const bookPaint = $('book-facepaint');
  const bookGuests = $('book-guests');
  const bookingEstimate = $('booking-estimate');
  const bookingCost = () => {
    const pkg = $('book-package').value;
    const extra = Math.max(0, clampGuests(bookGuests.value) - 15);
    return basePrices[pkg] + extra * 350 + (bookPaint.checked ? 1000 + extra * 100 : 0);
  };
  const updateBookingEstimate = () => { bookingEstimate.textContent = 'Предварительная стоимость: ' + rub(bookingCost()); };
  ['input', 'change'].forEach(type => {
    $('book-package').addEventListener(type, updateBookingEstimate);
    bookGuests.addEventListener(type, updateBookingEstimate);
    bookPaint.addEventListener(type, updateBookingEstimate);
  });
  bookGuests.addEventListener('blur', () => { bookGuests.value = clampGuests(bookGuests.value); updateBookingEstimate(); });
  const validatePhone = () => {
    const digits = bookPhone.value.replace(/\D/g, '');
    const valid = /^(?:[78]\d{10}|\d{10})$/.test(digits);
    bookPhone.setCustomValidity(valid ? '' : 'Введите номер из 10 цифр или российский номер с кодом +7 / 8.');
    return valid;
  };
  bookPhone.addEventListener('input', () => { bookPhone.setCustomValidity(''); });
  const openBooking = (packageKey, context = '') => {
    $('book-package').value = basePrices[packageKey] ? packageKey : calcPackage.value;
    $('book-guests').value = clampGuests(guestsInput.value);
    const today = localDateString(new Date());
    $('book-date').min = today;
    bookPaint.checked = facepaintInput.checked;
    updateBookingEstimate();
    bookingStatus.textContent = '';
    $('booking-result').hidden = true;
    if (context && !$('book-notes').value.includes(context)) $('book-notes').value = context + ($('book-notes').value ? '\n' + $('book-notes').value : '');
    if (!booking.open) booking.showModal();
    $('book-name').focus();
  };
  document.querySelectorAll('[data-book]').forEach(button => button.addEventListener('click', () => openBooking(button.dataset.book, button.dataset.bookContext || '')));
  $('calc-book').addEventListener('click', () => openBooking(calcPackage.value));
  document.querySelector('[data-close-book]').addEventListener('click', () => booking.close());
  booking.addEventListener('click', event => { if (event.target === booking) booking.close(); });

  const copyText = async text => {
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(text); return true; } catch (_) { /* local file:// fallback */ }
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.cssText = 'position:fixed;top:-1000px;left:-1000px;opacity:0';
    document.body.appendChild(textarea); textarea.focus(); textarea.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch (_) { copied = false; }
    textarea.remove(); return copied;
  };
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!validatePhone() || !form.reportValidity()) { form.reportValidity(); return; }
    const pkg = $('book-package').value;
    const guests = clampGuests($('book-guests').value);
    const date = $('book-date').value.split('-').reverse().join('.');
    const extra = Math.max(0, guests - 15);
    const fullPaint = bookPaint.checked;
    const cost = bookingCost();
    const lines = [
      'Здравствуйте! Хочу уточнить возможность бронирования праздника в детском зале «Радуга».',
      '',
      `Имя: ${$('book-name').value.trim()}`,
      `Телефон: ${$('book-phone').value.trim()}`,
      `Дата: ${date}`,
      `Желаемое начало: ${$('book-time').value} (уточняется с администратором)`,
      `Программа: ${titles[pkg]}`,
      `Гостей: ${guests}`,
      `Предварительный расчёт: ${rub(cost)}`,
      fullPaint ? 'Дополнительно: полный аквагрим' : '',
      $('book-notes').value.trim() ? `Пожелания: ${$('book-notes').value.trim()}` : '',
      '',
      'Подскажите, пожалуйста, свободна ли дата и какие будут условия бронирования?'
    ].filter((line, i) => line !== '' || i === 1).join('\n');
    const message = lines;
    $('booking-text').value = message;
    $('booking-sms').href = 'sms:+79063172638?body=' + encodeURIComponent(message);
    $('booking-result').hidden = false;
    bookingStatus.textContent = 'Заявка готова, но ещё не отправлена. Откройте ВКонтакте или SMS и отправьте сообщение.';
    bookingStatus.style.color = '#397a57';
    $('booking-result').focus({ preventScroll: true });
    $('booking-result').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  $('booking-copy').addEventListener('click', async () => {
    const ok = await copyText($('booking-text').value);
    bookingStatus.textContent = ok ? 'Текст заявки скопирован.' : 'Скопировать автоматически не удалось. Выделите текст заявки и скопируйте его вручную.';
  });
  $('booking-vk').addEventListener('click', () => {
    // Open tab directly in the click handler to avoid popup blockers.
    const copyPromise = copyText($('booking-text').value);
    window.open('https://vk.me/raduga_balashov64', '_blank', 'noopener,noreferrer');
    copyPromise.then(ok => {
      bookingStatus.textContent = ok
        ? 'Текст скопирован! Вставьте его в диалог ВКонтакте и отправьте.'
        : 'Диалог открыт. Скопируйте текст из поля ниже и отправьте его ВКонтакте.';
      bookingStatus.textContent += ' Если чат не открылся, используйте ссылку на группу ниже.';
    });
  });

  // Accessible photo lightbox
  const galleryDialog = $('gallery-dialog');
  const galleryButtons = [...document.querySelectorAll('[data-gallery]')];
  let activeImage = 0;
  const updateLightbox = () => {
    const selected = galleryButtons[activeImage];
    const image = selected.querySelector('img');
    $('lightbox-image').src = image.getAttribute('src');
    $('lightbox-image').alt = image.alt;
    $('lightbox-caption').textContent = selected.querySelector('span').textContent;
  };
  galleryButtons.forEach((button, index) => button.addEventListener('click', () => { activeImage = index; updateLightbox(); galleryDialog.showModal(); }));
  const moveLightbox = step => { activeImage = (activeImage + step + galleryButtons.length) % galleryButtons.length; updateLightbox(); };
  $('lightbox-prev').addEventListener('click', () => moveLightbox(-1));
  $('lightbox-next').addEventListener('click', () => moveLightbox(1));
  $('lightbox-close').addEventListener('click', () => galleryDialog.close());
  galleryDialog.addEventListener('click', event => { if (event.target === galleryDialog) galleryDialog.close(); });
  document.addEventListener('keydown', event => { if (!galleryDialog.open) return; if (event.key === 'ArrowLeft') moveLightbox(-1); if (event.key === 'ArrowRight') moveLightbox(1); });
  $('year').textContent = new Date().getFullYear();
})();
