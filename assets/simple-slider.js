document.addEventListener('DOMContentLoaded', () => {
  const sliders = Array.from(document.querySelectorAll('[data-slider]'));

  if (!sliders.length) {
    return;
  }

  const getVisibleCount = (el) => {
    const width = window.innerWidth;
    if (width <= 767 && el.dataset.sliderVisibleSm) {
      return parseInt(el.dataset.sliderVisibleSm, 10);
    }
    if (width <= 1024 && el.dataset.sliderVisibleMd) {
      return parseInt(el.dataset.sliderVisibleMd, 10);
    }
    if (width <= 1440 && el.dataset.sliderVisibleLg) {
      return parseInt(el.dataset.sliderVisibleLg, 10);
    }
    return parseInt(el.dataset.sliderVisible || '1', 10);
  };

  const updateLayout = (container) => {
    const track = container.querySelector('[data-slider-track]');
    if (!track) return;
    const items = Array.from(track.children);
    if (!items.length) return;

    const visible = Math.max(getVisibleCount(container), 1);
    const gap = parseFloat(container.dataset.sliderGap || '24');
    container.style.setProperty('--slider-gap', `${gap}px`);

    const trackWidth = track.clientWidth;
    let itemWidth = (trackWidth - gap * (visible - 1)) / visible;
    if (!Number.isFinite(itemWidth) || itemWidth <= 0) {
      itemWidth = trackWidth / visible;
    }
    items.forEach((item) => {
      item.style.flex = `0 0 ${itemWidth}px`;
    });

    container.dataset.sliderStep = String(itemWidth + gap);
  };

  const scrollByStep = (track, amount) => {
    track.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const initSlider = (container) => {
    const track = container.querySelector('[data-slider-track]');
    if (!track) return;

    track.classList.add('simple-slider__track');
    if (!container.classList.contains('simple-slider')) {
      container.classList.add('simple-slider');
    }

    const prev = container.querySelector('[data-slider-prev]');
    const next = container.querySelector('[data-slider-next]');

    if (prev) {
      prev.addEventListener('click', () => {
        const step = parseFloat(container.dataset.sliderStep || track.clientWidth);
        scrollByStep(track, -step);
      });
    }

    if (next) {
      next.addEventListener('click', () => {
        const step = parseFloat(container.dataset.sliderStep || track.clientWidth);
        scrollByStep(track, step);
      });
    }

    container.addEventListener('wheel', (event) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) {
        return;
      }
      event.preventDefault();
      track.scrollBy({ left: event.deltaX, behavior: 'smooth' });
    }, { passive: false });

    const autoplayDelay = parseInt(container.dataset.sliderAutoplay || '', 10);
    if (Number.isFinite(autoplayDelay) && autoplayDelay > 0) {
      let timer;
      const play = () => {
        clearInterval(timer);
        timer = window.setInterval(() => {
          const step = parseFloat(container.dataset.sliderStep || track.clientWidth);
          const reachedEnd = Math.ceil(track.scrollLeft + track.clientWidth) >= track.scrollWidth;
          if (reachedEnd) {
            track.scrollTo({ left: 0, behavior: 'smooth' });
          } else {
            scrollByStep(track, step);
          }
        }, autoplayDelay);
      };
      const pause = () => clearInterval(timer);
      container.addEventListener('mouseenter', pause);
      container.addEventListener('mouseleave', play);
      container.addEventListener('focusin', pause);
      container.addEventListener('focusout', play);
      play();
    }

    updateLayout(container);
  };

  const handleResize = () => {
    sliders.forEach(updateLayout);
  };

  sliders.forEach(initSlider);
  window.addEventListener('resize', handleResize);
});
