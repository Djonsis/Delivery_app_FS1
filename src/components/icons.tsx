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

export function UserProfileIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none"
      {...props}
    >
      <g clipPath="url(#clip0_1051_117)">
        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z" fill="currentColor"/>
      </g>
      <defs>
        <clipPath id="clip0_1051_117">
          <rect width="24" height="24" fill="white"/>
        </clipPath>
      </defs>
    </svg>
  );
}

export function CatalogIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      fill="none"
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M2.95 4.55a1.6 1.6 0 0 1 1.6-1.6h4.9a1.6 1.6 0 0 1 1.6 1.6v4.9a1.6 1.6 0 0 1-1.6-1.6h-4.9a1.6 1.6 0 0 1-1.6-1.6zm6.5 0h-4.9v4.9h4.9zm-6.5 10a1.6 1.6 0 0 1 1.6-1.6h4.9a1.6 1.6 0 0 1 1.6 1.6v4.9a1.6 1.6 0 0 1-1.6-1.6h-4.9a1.6 1.6 0 0 1-1.6-1.6zm6.5 0h-4.9v4.9h4.9zm3.5-10a1.6 1.6 0 0 1 1.6-1.6h4.9a1.6 1.6 0 0 1 1.6 1.6v4.9a1.6 1.6 0 0 1-1.6-1.6h-4.9a1.6 1.6 0 0 1-1.6-1.6zm6.5 0h-4.9v4.9h4.9zm-6.5 10a1.6 1.6 0 0 1 1.6-1.6h4.9a1.6 1.6 0 0 1 1.6 1.6v4.9a1.6 1.6 0 0 1-1.6-1.6h-4.9a1.6 1.6 0 0 1-1.6-1.6zm6.5 0h-4.9v4.9h4.9z"
        clipRule="evenodd"
      ></path>
    </svg>
  );
}
