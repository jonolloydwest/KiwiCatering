(() => {
  const STAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17.3l6.18 3.7-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z"/></svg>';

  function enhanceGoogleReviewsSlider(section) {
    const list = section.querySelector('.google-reviews__list');
    const prevButton = section.querySelector('[data-slider-prev]');
    const nextButton = section.querySelector('[data-slider-next]');

    if (!list || !prevButton || !nextButton) return;

    const getGap = () => {
      const styles = window.getComputedStyle(list);
      const parseGap = (value) => {
        if (!value) return null;
        const parsed = parseFloat(value);
        return Number.isNaN(parsed) ? null : parsed;
      };

      return (
        parseGap(styles.columnGap) ??
        parseGap(styles.gap) ??
        0
      );
    };

    const getStep = () => {
      const firstSlide = list.querySelector('.google-reviews__item');
      return firstSlide ? firstSlide.getBoundingClientRect().width + getGap() : list.clientWidth;
    };

    const updateButtons = () => {
      const maxScroll = Math.max(0, list.scrollWidth - list.clientWidth);
      prevButton.disabled = list.scrollLeft <= 0;
      nextButton.disabled = list.scrollLeft >= maxScroll - 1;
    };

    const scrollByStep = (direction) => {
      list.scrollBy({
        left: getStep() * direction,
        behavior: 'smooth',
      });
    };

    if (list.dataset.sliderBound !== 'true') {
      prevButton.addEventListener('click', (event) => {
        event.preventDefault();
        scrollByStep(-1);
      });

      nextButton.addEventListener('click', (event) => {
        event.preventDefault();
        scrollByStep(1);
      });

      list.addEventListener('scroll', () => window.requestAnimationFrame(updateButtons));
      window.addEventListener('resize', () => window.requestAnimationFrame(updateButtons));

      list.dataset.sliderBound = 'true';
    }

    window.requestAnimationFrame(updateButtons);
  }

  function buildReviewItem(review, sectionId, index) {
    const rating = Math.max(1, Math.min(5, Math.round(review.rating || 5)));
    const stars = Array.from({ length: rating }).map(() => STAR_SVG).join('');

    const li = document.createElement('li');
    li.className = 'google-reviews__item slider__slide';
    li.id = `Slide-${sectionId}-${index + 1}`;
    li.innerHTML = `
      <article class="google-reviews__card">
        <div class="google-reviews__rating">
          ${stars}
          <span>${rating.toFixed(1)}</span>
        </div>
        <p class="google-reviews__text">${review.text || ''}</p>
        <div class="google-reviews__footer">
          <span class="google-reviews__author">${review.author_name || review.author || 'Google Reviewer'}</span>
          ${review.relative_time_description || review.meta ? `<span class="google-reviews__meta">${review.relative_time_description || review.meta}</span>` : ''}
        </div>
      </article>
    `;
    return li;
  }

  function initGoogleReviews(section) {
    const feedUrl = section.dataset.feedUrl;
    if (!feedUrl) return;

    const maxReviews = parseInt(section.dataset.maxReviews || '6', 10);
    const list = section.querySelector('.google-reviews__list');
    if (!list) return;

    fetch(feedUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        const reviews = Array.isArray(payload)
          ? payload
          : Array.isArray(payload.reviews)
            ? payload.reviews
            : [];

        if (!reviews.length) return;

        list.innerHTML = '';
        reviews.slice(0, maxReviews).forEach((review, index) => {
          list.appendChild(buildReviewItem(review, section.dataset.sectionId, index));
        });

        const sliderButtons = section.querySelector('.google-reviews__slider-buttons');
        if (sliderButtons) sliderButtons.hidden = false;
        enhanceGoogleReviewsSlider(section);
      })
      .catch((error) => {
        console.warn('Google reviews feed failed:', error);
      });
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-google-reviews]').forEach((section) => {
      initGoogleReviews(section);
      enhanceGoogleReviewsSlider(section);
    });
  });
})();
