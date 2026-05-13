import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion — Kiwi OS",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
