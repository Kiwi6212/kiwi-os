import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Veille — Kiwi OS",
  description: "Lecteur RSS pour suivre l'actualité tech, cyber, IA et plus.",
};

export default function VeilleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
