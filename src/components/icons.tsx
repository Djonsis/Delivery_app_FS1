import type { SVGProps } from "react";

export function FastBasketIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M16 11V7a4 4 0 0 0-8 0v4" />
      <path d="M12 11H3.5l1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6L20.5 11H12Z" />
      <path d="M12 11V7" />
      <path d="M17.5 11l-1.5-6" />
      <path d="M6.5 11l1.5-6" />
    </svg>
  );
}
