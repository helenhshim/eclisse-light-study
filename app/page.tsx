import type { Metadata } from "next";
import LampScene from "./LampScene";
import styles from "./eclisse.module.css";

const description = "A study of light and movement, inspired by the Eclisse lamp. An interactive experiment by Helen Shim.";

export const metadata: Metadata = {
  title: "Eclisse — Helen Shim",
  description,
  alternates: { canonical: "https://helenshim.me/eclisse" },
  openGraph: {
    title: "Eclisse — a study of light",
    description,
    url: "https://helenshim.me/eclisse",
    type: "website",
    images: [{ url: "https://helenshim.me/eclisse/studio.webp", width: 1241, height: 1267, alt: "Orange Eclisse lamp" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Eclisse — a study of light",
    description,
    images: ["https://helenshim.me/eclisse/studio.webp"],
  },
};

export default function EclissePage() {
  return (
    <main className={styles.scene} aria-label="Eclisse, a study of light">
      <LampScene />
    </main>
  );
}
