export const BOOKING_CONFIRMED_COOKIE = "booking_confirmed";

type CookiesSetter = {
  set: (
    name: string,
    value: string,
    options: {
      httpOnly: boolean;
      sameSite: "lax";
      secure: boolean;
      path: string;
      maxAge: number;
    },
  ) => void;
};

export function isBookingConfirmedValue(value: string | undefined) {
  return value === "true";
}

export function setBookingConfirmedCookie(cookies: CookiesSetter) {
  cookies.set(BOOKING_CONFIRMED_COOKIE, "true", {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}
