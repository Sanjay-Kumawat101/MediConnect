(function() {
  function updateGreeting() {
    const heading = document.querySelector('.welcome-text h1');
    if (!heading) return;

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' :
      hour < 17 ? 'Good Afternoon' :
      hour < 21 ? 'Good Evening' : 'Good Night';
    const name = document.getElementById('userName')?.textContent.trim();
    const displayName = name && name !== 'Loading...' ? `, ${name}` : '';
    heading.textContent = `${greeting}${displayName}!`;
  }

  window.updateDashboardGreeting = updateGreeting;
  document.addEventListener('DOMContentLoaded', updateGreeting);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) updateGreeting();
  });
  setInterval(updateGreeting, 60_000);
})();
