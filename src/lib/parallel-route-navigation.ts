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
  if (canNavigateBack()) {
    router.back();
    return;
  }

  router.replace(fallbackHref);
}
