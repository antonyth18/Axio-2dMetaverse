import { useCallback } from 'react';

export const useScrollAnimation = (threshold = 0.1) => {
  return useCallback((el: HTMLElement | null) => {
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.remove('opacity-0', 'translate-y-8', 'translate-y-12');
          entry.target.classList.add('opacity-100', 'translate-y-0');
        }
      });
    }, { threshold });
    observer.observe(el);
  }, [threshold]);
};