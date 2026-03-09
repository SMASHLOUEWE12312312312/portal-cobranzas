// Prevent flash of wrong theme - runs before React hydration
(function() {
  var theme = localStorage.getItem('portal-theme') || 'light';
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  }
})();
