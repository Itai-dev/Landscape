// Illustrated avatars for people listed from public sources. One SVG per person, made at build time from the
// person's id only (no photo, no personal data), so the same person always gets the same drawing.
// Style: DiceBear "Notionists". Artwork by Zoish, CC0 1.0; DiceBear code, MIT (see node_modules/@dicebear/notionists/LICENSE).
// Options are limited to parts that don't read strongly as one gender: no beards, short/medium hair only,
// no hijab, buns or long hair, no ties, no hand gestures. Files are named by a hash of the id, so the URL
// carries no name. They are written to public/avatars/ (git-ignored) and served as /avatars/<file>.svg.
import { createHash } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createAvatar } from "@dicebear/core";
import { notionists } from "@dicebear/collection";

const v = (...n) => n.map((i) => "variant" + String(i).padStart(2, "0"));

const OPTIONS = {
  hair: v(1, 3, 9, 11, 13, 17, 20, 22, 24, 25, 33, 40),
  lips: v(3, 5, 6, 13, 14, 17, 19, 20, 21, 22, 23, 24, 25, 27, 30),
  body: v(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25),
  beardProbability: 0,
  gestureProbability: 0,
  bodyIconProbability: 0,
  glassesProbability: 15,
  // Transparent: the circle behind it comes from CSS, so light and dark themes both work.
  backgroundColor: ["transparent"],
};

export const avatarFile = (id) => createHash("sha256").update("avatar:" + id).digest("hex").slice(0, 16) + ".svg";

const minify = (svg) =>
  svg
    .replace(/<metadata[\s\S]*?<\/metadata>/g, "")
    .replace(/>\s+</g, "><")
    .replace(/\s{2,}/g, " ")
    .trim();

export function writeAvatars(people, dir = "public/avatars") {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  let bytes = 0;
  for (const p of people) {
    const svg = minify(createAvatar(notionists, { ...OPTIONS, seed: p.id }).toString());
    writeFileSync(`${dir}/${avatarFile(p.id)}`, svg);
    bytes += svg.length;
  }
  return { count: people.length, bytes };
}
