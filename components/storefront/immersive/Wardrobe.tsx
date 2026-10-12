"use client";
import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import {
  DEFAULT_AVATAR,
  CHARACTERS,
  TOP_COLORS,
  TROUSER_COLORS,
  type Avatar,
} from "@/lib/immersive/avatar";
import styles from "./ImmersiveStorefront.module.css";
export function Wardrobe({
  value,
  onApply,
}: {
  value: Avatar;
  onApply: (value: Avatar) => void;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <div className={styles.wardrobe}>
      <p>Choose your character and a complete, textured outfit.</p>
      <fieldset>
        <legend>Character & outfit</legend>
        <div className={styles.characterChoices}>
          {CHARACTERS.map((c) => (
            <button
              key={c.id}
              aria-label={c.name}
              type="button"
              aria-pressed={draft.character === c.id}
              onClick={() => setDraft({ ...draft, character: c.id })}
            >
              {/* Local authored asset preview, not a remote user image. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/storefront/immersive/people/${c.id}.webp`}
                alt=""
                width={160}
                height={220}
              />
              <span>
                <strong>{c.name}</strong>
                {draft.character === c.id && <Check size={17} />}
              </span>
              <small>{c.description}</small>
            </button>
          ))}
        </div>
      </fieldset>
      {[
        { key: "top", label: "Fabric tint", options: TOP_COLORS },
        { key: "trousers", label: "Trouser finish", options: TROUSER_COLORS },
      ].map((g) => (
        <fieldset key={g.key}>
          <legend>{g.label}</legend>
          <div className={styles.swatches}>
            {g.options.map((o) => (
              <button
                key={o.id}
                type="button"
                aria-label={o.name}
                aria-pressed={draft[g.key as "top" | "trousers"] === o.id}
                onClick={() => setDraft({ ...draft, [g.key]: o.id })}
              >
                <span
                  className={styles.colorChip}
                  style={{ backgroundColor: o.hex }}
                />
                {o.name}
                {draft[g.key as "top" | "trousers"] === o.id && (
                  <Check size={14} />
                )}
              </button>
            ))}
          </div>
        </fieldset>
      ))}
      <div className={styles.wardrobeActions}>
        <button
          type="button"
          className={styles.secondary}
          onClick={() => setDraft({ ...DEFAULT_AVATAR })}
        >
          <RotateCcw size={16} />
          Reset look
        </button>
        <button
          type="button"
          className={styles.primary}
          onClick={() => onApply(draft)}
        >
          Wear this look
        </button>
      </div>
      <p className={styles.help}>
        Free to change. Your chosen character and outfit are saved in this
        browser.
      </p>
    </div>
  );
}
