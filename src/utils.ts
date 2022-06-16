export const join = (...xs: (undefined | null | false | string)[]) =>
  xs.filter(Boolean).join(" ");
