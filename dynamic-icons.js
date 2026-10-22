/* Nongki dynamic shrink.
   Follows the same scroll-direction rule as the bottom navbar.
   Visual-only: does not touch cart, payment, database, sync, login, or navigation logic. */
(function initNongkiDynamicSalesIcons(){
  'use strict';

  var main = document.querySelector('main');
  var sales = document.getElementById('salesView');
  if (!main || !sales || main.dataset.dynamicIconsObserver === 'ready') return;
  main.dataset.dynamicIconsObserver = 'ready';

  var previousTop = Math.max(0, main.scrollTop || 0);
  var rafPending = false;

  function applyScrollState() {
    rafPending = false;

    var top = Math.max(0, main.scrollTop || 0);
    var currentCompact = sales.getAttribute('data-icons-compact') === 'true';
    var nextCompact = currentCompact;

    /* Match bottomNavigation: collapse on downward page movement after 20px,
       expand as soon as the user reverses direction, reset at the top. */
    if (top <= 20) {
      nextCompact = false;
    } else if (top > previousTop) {
      nextCompact = true;
    } else if (top < previousTop) {
      nextCompact = false;
    }

    if (nextCompact !== currentCompact) {
      sales.setAttribute('data-icons-compact', nextCompact ? 'true' : 'false');
    }

    previousTop = top;
  }

  main.addEventListener('scroll', function () {
    if (rafPending) return;
    rafPending = true;
    window.requestAnimationFrame(applyScrollState);
  }, { passive: true });

  /* Set the initial state without changing any app data or behavior. */
  sales.setAttribute('data-icons-compact', previousTop > 20 ? 'true' : 'false');
})();
