/* Nongki dynamic icon shrink.
   Visual-only scroll observer; does not touch cart, payment, database, sync or navigation logic. */
(function initNongkiDynamicSalesIcons(){
  'use strict';
  var main = document.querySelector('main');
  var sales = document.getElementById('salesView');
  if (!main || !sales || main.dataset.dynamicIconsObserver === 'ready') return;
  main.dataset.dynamicIconsObserver = 'ready';

  var previousTop = main.scrollTop || 0;
  var compact = false;
  var rafPending = false;

  function applyScrollState() {
    rafPending = false;
    var top = Math.max(0, main.scrollTop || 0);
    var delta = top - previousTop;

    /* Follow the floating navbar: compact while scrolling down, restore while scrolling up.
       Small deltas are ignored to prevent touch-scroll jitter from repeatedly toggling state. */
    if (top <= 18) {
      compact = false;
    } else if (delta >= 3) {
      compact = true;
    } else if (delta <= -4) {
      compact = false;
    }

    var value = compact ? 'true' : 'false';
    if (sales.getAttribute('data-icons-compact') !== value) {
      sales.setAttribute('data-icons-compact', value);
    }
    previousTop = top;
  }

  main.addEventListener('scroll', function () {
    if (rafPending) return;
    rafPending = true;
    window.requestAnimationFrame(applyScrollState);
  }, { passive: true });

  /* Keep restored scroll positions consistent without an initial animation jump. */
  if (previousTop > 18) {
    compact = true;
    sales.setAttribute('data-icons-compact', 'true');
  } else {
    sales.setAttribute('data-icons-compact', 'false');
  }
})();
