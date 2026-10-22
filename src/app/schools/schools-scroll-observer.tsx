"use client";

import { useEffect } from "react";

export function SchoolsScrollObserver() {
  useEffect(() => {
    // Enable scroll reveal styles smoothly
    document.documentElement.classList.add("animations-ready");

    const elements = document.querySelectorAll(".reveal-on-scroll");
    if (!elements.length) return;

    // Reveal any elements already within the viewport or shortly ahead
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px",
      }
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return null;
}
