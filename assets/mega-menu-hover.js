document.addEventListener('DOMContentLoaded', () => {
  const desktopQuery = window.matchMedia('(min-width: 990px)');

  const toggleOnHover = (details) => {
    let hoverTimeout;

    const openMenu = () => {
      if (!desktopQuery.matches) return;
      details.setAttribute('open', '');
    };

    const closeMenu = () => {
      if (!desktopQuery.matches) return;
      hoverTimeout = window.setTimeout(() => {
        details.removeAttribute('open');
      }, 80);
    };

    const cancelClose = () => {
      if (hoverTimeout) {
        window.clearTimeout(hoverTimeout);
        hoverTimeout = null;
      }
    };

    details.addEventListener('mouseenter', () => {
      cancelClose();
      openMenu();
    });

    details.addEventListener('mouseleave', () => {
      cancelClose();
      closeMenu();
    });

    details.addEventListener('focusin', () => {
      cancelClose();
      openMenu();
    });

    details.addEventListener('focusout', (event) => {
      if (!details.contains(event.relatedTarget)) {
        closeMenu();
      }
    });
  };

  const initHoverMenus = () => {
    const hoverDetails = document.querySelectorAll('header-menu details[data-hover-open]');
    hoverDetails.forEach((details) => toggleOnHover(details));
  };

  initHoverMenus();

  document.addEventListener('shopify:section:load', initHoverMenus);
  document.addEventListener('shopify:section:block:select', initHoverMenus);
});
