/* Nongki dynamic shrink — stable scroll hysteresis.
   Does not touch cart, payment, database, sync, login, or navigation logic. */
(function initNongkiDynamicSalesIcons(){
  'use strict';
  var main = document.querySelector('main');
  var sales = document.getElementById('salesView');
  if (!main || !sales || main.dataset.dynamicIconsObserver === 'ready') return;
  main.dataset.dynamicIconsObserver = 'ready';
  var previousTop = Math.max(0, main.scrollTop || 0);
  var rafPending = false;
  var scrollDirection = 0;
  var scrollTravel = 0;
  function applyScrollState() {
    rafPending = false;
    var top = Math.max(0, main.scrollTop || 0);
    var currentCompact = sales.getAttribute('data-icons-compact') === 'true';
    var nextCompact = currentCompact;
    var delta = top - previousTop;
    if (top <= 20) {
      scrollDirection = 0;
      scrollTravel = 0;
      nextCompact = false;
    } else if (Math.abs(delta) >= 1) {
      var direction = delta > 0 ? 1 : -1;
      if (direction !== scrollDirection) { scrollDirection = direction; scrollTravel = 0; }
      scrollTravel += Math.abs(delta);
      var threshold = scrollDirection > 0 ? 18 : 28;
      if (scrollTravel >= threshold) {
        nextCompact = scrollDirection > 0;
        scrollTravel = 0;
      }
    }
    if (nextCompact !== currentCompact) sales.setAttribute('data-icons-compact', nextCompact ? 'true' : 'false');
    previousTop = top;
  }
  main.addEventListener('scroll', function () {
    if (rafPending) return;
    rafPending = true;
    window.requestAnimationFrame(applyScrollState);
  }, { passive: true });
  sales.setAttribute('data-icons-compact', previousTop > 20 ? 'true' : 'false');
})();