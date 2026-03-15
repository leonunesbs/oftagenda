"use client";

type RouterLike = {
  back: () => void;
  replace: (href: string) => void;
};

function hasSameOriginReferrer() {
  if (typeof window === "undefined" || !document.referrer) {
    return false;
  }

  try {
    return new URL(document.referrer).origin === window.location.origin;
  } catch {
    return false;
  }
}

function canNavigateBack() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.history.length > 1 && hasSameOriginReferrer();
}

export function closeParallelRoute(
  router: RouterLike,
  fallbackHref: string,
) {
  if (typeof window === "undefined") {
    router.replace(fallbackHref);
    return;
  }

  if (canNavigateBack()) {
    const currentUrl = window.location.href;
    router.back();

    // In intercepted/parallel routes, history back can be ignored in some cases.
    // If URL does not change shortly after back, force-close via fallback route.
    window.setTimeout(() => {
      if (window.location.href === currentUrl) {
        router.replace(fallbackHref);
      }
    }, 120);
    return;
  }

  router.replace(fallbackHref);
}
