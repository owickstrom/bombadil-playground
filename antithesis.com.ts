import { extract, always } from "@antithesishq/bombadil";
export * from "@antithesishq/bombadil/defaults";

const url = extract((state) => state.window.location.toString());

const logos = extract(
  (state) => state.document.body?.querySelectorAll(".nav-logo").length ?? 0,
);

const isDocsPage = extract((state) =>
  state.window.location.pathname.startsWith("/docs"),
);

export const hasLogo = always(() => !isDocsPage.current || logos.current > 0);
