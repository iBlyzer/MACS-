document.addEventListener('DOMContentLoaded', () => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      } else {
        entry.target.classList.remove('visible');
      }
    });
  }, { threshold: 0.1 });

  const elementsToReveal = document.querySelectorAll('.reveal-on-scroll');
  elementsToReveal.forEach(element => {
    observer.observe(element);
  });
});
