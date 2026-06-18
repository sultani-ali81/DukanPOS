import React from "react";

type Props = {
  /** The form (or any content) shown on the white panel */
  children: React.ReactNode;
  /** Content shown on the colored side panel */
  panel: React.ReactNode;
  /** When true, the form sits on the right and the colored panel on the left */
  reverse?: boolean;
};

export default function AuthLayout({
  children,
  panel,
  reverse = false,
}: Props) {
  return (
    <div className="flex min-h-screen w-full">
      <div className="relative w-full overflow-hidden bg-white">
        <div className="grid min-h-screen lg:grid-cols-2">
          {/* Form Side */}
          <div
            className={`flex items-center justify-center p-8 sm:p-12 ${
              reverse ? "lg:order-2" : "lg:order-1"
            }`}
          >
            {children}
          </div>

          {/* Colored Panel Side */}
          <div
            className={`relative hidden flex-col items-center justify-center overflow-hidden bg-primary px-12 text-center text-white lg:flex ${
              reverse ? "lg:order-1" : "lg:order-2"
            }`}
          >
            {/* Decorative geometric accents (matching reference) */}
            <div className="pointer-events-none absolute -left-10 top-10 h-28 w-28 rotate-45 rounded-3xl bg-white/10" />
            <div className="pointer-events-none absolute right-8 top-24 h-16 w-16 rounded-full border-2 border-white/20" />
            <div className="pointer-events-none absolute bottom-12 left-16 h-20 w-20 rotate-12 rounded-2xl border-2 border-white/20" />
            <div className="pointer-events-none absolute -right-12 bottom-0 h-36 w-36 rounded-full bg-white/10" />

            <div className="relative z-10 max-w-sm">{panel}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
