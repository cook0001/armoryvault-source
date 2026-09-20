/**
 * ArmoryVault Portal — Modern Interactive Controller
 * Streamlined, lightweight, and zero bloat.
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initOsDetection();
  initShowcaseTabs();
  initScreenshotLightbox();
  initDonationDeck();
  initFaqAccordion();
  initCopyButtons();
  initDocsSearchAndTabs();
});

/* ==========================================================================
   1. Navbar & Scroll State
   ========================================================================== */
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  const navToggle = document.querySelector('.nav-toggle');
  const mobileMenu = document.querySelector('.mobile-nav-menu');
  const mobileLinks = document.querySelectorAll('.mobile-nav-link');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 30) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  const svgMenu =
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>';
  const svgClose =
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

  if (navToggle && mobileMenu) {
    navToggle.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');
      const isOpen = mobileMenu.classList.contains('open');
      navToggle.setAttribute('aria-expanded', isOpen);
      navToggle.innerHTML = isOpen ? svgClose : svgMenu;
    });

    mobileLinks.forEach((link) => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        if (navToggle) navToggle.innerHTML = svgMenu;
      });
    });
  }
}

/* ==========================================================================
   2. OS Detection & Smart Hero Download
   ========================================================================== */
function initOsDetection() {
  const ua = navigator.userAgent.toLowerCase();
  const platform = navigator.platform?.toLowerCase() || '';

  let detectedCardId = 'download-windows';
  let targetUrl = '/downloads/desktop/ArmoryVault-Windows-x64-Setup.exe';
  let btnLabel = 'Download for Windows (.exe)';

  if (ua.includes('mac') || platform.includes('mac')) {
    detectedCardId = 'download-mac-arm';
    targetUrl = '/downloads/desktop/ArmoryVault-macOS-arm64.dmg';
    btnLabel = 'Download for macOS (Apple Silicon)';
    // Check for Apple Silicon vs Intel
    if (navigator.userAgentData) {
      navigator.userAgentData
        .getHighEntropyValues(['architecture'])
        .then((data) => {
          if (data.architecture === 'x86') {
            detectedCardId = 'download-mac-intel';
            targetUrl = '/downloads/desktop/ArmoryVault-macOS-x64.dmg';
            btnLabel = 'Download for macOS (Intel x64)';
          }
          applyDetection(detectedCardId, btnLabel, targetUrl);
        })
        .catch(() => applyDetection(detectedCardId, btnLabel, targetUrl));
      return;
    }
  } else if (ua.includes('linux') || platform.includes('linux')) {
    detectedCardId = 'download-linux';
    targetUrl = '/downloads/desktop/ArmoryVault-Linux-x86_64.AppImage';
    btnLabel = 'Download for Linux (.AppImage)';
  } else if (ua.includes('android')) {
    detectedCardId = 'download-mobile';
    targetUrl = '/downloads/mobile/armoryvault-companion-latest.apk';
    btnLabel = 'Download Android APK Direct';
  }

  applyDetection(detectedCardId, btnLabel, targetUrl);
}

function applyDetection(cardId, label, url) {
  const heroBtn = document.getElementById('hero-smart-download-btn');
  const heroBtnText = document.getElementById('hero-smart-btn-text');

  if (heroBtn && heroBtnText) {
    heroBtnText.textContent = label;
    heroBtn.href = url;
  }

  // Highlight corresponding card in download matrix
  document
    .querySelectorAll('.download-card')
    .forEach((card) => card.classList.remove('highlighted'));
  const targetCard = document.getElementById(cardId);
  if (targetCard) {
    targetCard.classList.add('highlighted');
  }
}

/* ==========================================================================
   3. Showcase Tabs (Desktop vs Mobile)
   ========================================================================== */
function initShowcaseTabs() {
  const tabBtns = document.querySelectorAll('.showcase-tab-btn');
  const viewDesktop = document.getElementById('showcase-view-desktop');
  const viewMobile = document.getElementById('showcase-view-mobile');

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const target = btn.dataset.target;
      if (target === 'mobile') {
        if (viewDesktop) viewDesktop.style.display = 'none';
        if (viewMobile) viewMobile.style.display = 'flex';
      } else {
        if (viewDesktop) viewDesktop.style.display = 'block';
        if (viewMobile) viewMobile.style.display = 'none';
      }
    });
  });
}

/* ==========================================================================
   3b. Screenshot Lightbox Modal Controller
   ========================================================================== */
function initScreenshotLightbox() {
  const trigger = document.getElementById('open-screenshot-lightbox');
  const dialog = document.getElementById('screenshot-lightbox');
  if (!trigger || !dialog) return;

  const openModal = () => {
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    }
  };

  trigger.addEventListener('click', openModal);
  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openModal();
    }
  });

  const downloadLink = document.getElementById('lightbox-download-link');
  if (downloadLink) {
    downloadLink.addEventListener('click', () => {
      dialog.close();
    });
  }

  // Modern Web Guidance: Fallback for browsers without native closedBy support (e.g. Safari)
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (!isContent) {
        dialog.close();
      }
    });
  }
}

/* ==========================================================================
   4. Donation Amount Selector
   ========================================================================== */
function initDonationDeck() {
  const chips = document.querySelectorAll('.donation-chip');
  const customInput = document.getElementById('custom-donation-input');
  const paypalBtn = document.getElementById('btn-paypal-proceed');
  const paypalText = document.getElementById('btn-paypal-proceed-text');

  function updatePaypal(amount) {
    const cleanAmount = Math.max(parseFloat(amount) || 25, 1);
    if (paypalBtn) {
      paypalBtn.href = `https://paypal.me/ArmoryVault/${cleanAmount}USD`;
    }
    if (paypalText) {
      paypalText.textContent = `Proceed to Donate $${cleanAmount} USD via PayPal`;
    }
  }

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      if (customInput) customInput.value = '';
      updatePaypal(chip.dataset.amount);
    });
  });

  if (customInput) {
    customInput.addEventListener('input', () => {
      chips.forEach((c) => c.classList.remove('active'));
      if (customInput.value) {
        updatePaypal(customInput.value);
      }
    });
  }
}

/* ==========================================================================
   5. FAQ Accordion
   ========================================================================== */
function initFaqAccordion() {
  const items = document.querySelectorAll('.faq-item');
  items.forEach((item) => {
    const question = item.querySelector('.faq-question');
    if (question) {
      question.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        items.forEach((i) => i.classList.remove('open'));
        if (!isOpen) {
          item.classList.add('open');
        }
      });
    }
  });
}

/* ==========================================================================
   6. 1-Click Clipboard Copy
   ========================================================================== */
function initCopyButtons() {
  const copyBtns = document.querySelectorAll('.btn-copy-cmd');
  copyBtns.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const textToCopy = btn.dataset.cmd || 'xattr -cr /Applications/ArmoryVault.app';
      try {
        await navigator.clipboard.writeText(textToCopy);
        const originalHtml = btn.innerHTML;
        btn.innerHTML = `<span style="color: #10b981; display: inline-flex; align-items: center; gap: 4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied</span>`;
        setTimeout(() => {
          btn.innerHTML = originalHtml;
        }, 2000);
      } catch (_err) {
        // Fallback for non-https/permissions
        const temp = document.createElement('input');
        temp.value = textToCopy;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
        const originalHtml = btn.innerHTML;
        btn.innerHTML = `<span style="color: #10b981; display: inline-flex; align-items: center; gap: 4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied</span>`;
        setTimeout(() => {
          btn.innerHTML = originalHtml;
        }, 2000);
      }
    });
  });
}

/* ==========================================================================
   7. Documentation & Knowledge Base Controller
   ========================================================================== */
function initDocsSearchAndTabs() {
  const searchInput = document.getElementById('doc-search-input');
  const clearBtn = document.getElementById('doc-search-clear');
  const pills = document.querySelectorAll('.doc-pill');
  const items = document.querySelectorAll('.doc-item');
  const noResults = document.getElementById('doc-no-results');
  const resetBtn = document.getElementById('btn-reset-doc-filters');

  if (!items.length) return;

  let activeCategory = 'all';
  let searchQuery = '';

  function filterDocs() {
    let visibleCount = 0;
    const query = searchQuery.trim().toLowerCase();

    items.forEach((item) => {
      const category = item.dataset.category || '';
      const categoryMatch = activeCategory === 'all' || category === activeCategory;

      let textMatch = true;
      if (query) {
        const text = item.textContent.toLowerCase();
        textMatch = text.includes(query);
      }

      if (categoryMatch && textMatch) {
        item.style.display = '';
        visibleCount++;
        if (query) {
          item.open = true;
        }
      } else {
        item.style.display = 'none';
      }
    });

    if (noResults) {
      noResults.style.display = visibleCount === 0 ? 'block' : 'none';
    }

    if (clearBtn) {
      clearBtn.style.display = query.length > 0 ? 'flex' : 'none';
    }
  }

  // Category pill clicks
  pills.forEach((pill) => {
    pill.addEventListener('click', () => {
      pills.forEach((p) => {
        p.classList.remove('active');
        p.setAttribute('aria-selected', 'false');
      });
      pill.classList.add('active');
      pill.setAttribute('aria-selected', 'true');
      activeCategory = pill.dataset.category || 'all';
      filterDocs();
    });
  });

  // Search input typing
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      filterDocs();
    });
  }

  // Clear search button
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      searchQuery = '';
      filterDocs();
    });
  }

  // Reset filters button
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      searchQuery = '';
      activeCategory = 'all';
      pills.forEach((p) => {
        const isAll = p.dataset.category === 'all';
        p.classList.toggle('active', isAll);
        p.setAttribute('aria-selected', isAll ? 'true' : 'false');
      });
      filterDocs();
    });
  }

  // Deep linking via URL hash (e.g. #guide-lan-pairing)
  function handleHash() {
    const hash = window.location.hash;
    if (hash?.startsWith('#guide-')) {
      const targetDoc = document.querySelector(hash);
      if (targetDoc && targetDoc.tagName.toLowerCase() === 'details') {
        const category = targetDoc.dataset.category;
        if (category) {
          const matchingPill = document.querySelector(`.doc-pill[data-category="${category}"]`);
          if (matchingPill) {
            matchingPill.click();
          }
        }
        targetDoc.open = true;
        setTimeout(() => {
          targetDoc.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      }
    }
  }

  window.addEventListener('hashchange', handleHash);
  if (window.location.hash) {
    handleHash();
  }
}
