"use client";
import { useState } from "react";
import { Shirt, Check, RotateCcw } from "lucide-react";
import {
  DEFAULT_AVATAR,
  OUTFITS,
  CLOTH_COLORS,
  TROUSER_COLORS,
  SHOE_COLORS,
  SKIN_COLORS,
  HAIR_COLORS,
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
  const [draft, setDraft] = useState(value),
    [tab, setTab] = useState<"outfit" | "appearance">("outfit");
  const groups =
    tab === "outfit"
      ? [
          { key: "top", label: "Top color", options: CLOTH_COLORS },
          { key: "trousers", label: "Trousers", options: TROUSER_COLORS },
          { key: "shoes", label: "Footwear", options: SHOE_COLORS },
        ]
      : [
          { key: "skin", label: "Skin tone", options: SKIN_COLORS },
          { key: "hair", label: "Hair color", options: HAIR_COLORS },
        ];
  return (
    <div className={styles.wardrobe}>
      <p>Make yourself at home. Choose your look for the store.</p>
      <div
        className={styles.wardrobeTabs}
        role="group"
        aria-label="Customization category"
      >
        {(["outfit", "appearance"] as const).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={tab === t}
            onClick={() => setTab(t)}
          >
            {t === "outfit" ? "Clothing" : "Appearance"}
          </button>
        ))}
      </div>
      {tab === "outfit" && (
        <fieldset>
          <legend>Choose an outfit</legend>
          <div className={styles.outfits}>
            {OUTFITS.map((o) => (
              <button
                key={o.id}
                type="button"
                aria-pressed={draft.outfit === o.id}
                onClick={() => setDraft({ ...draft, outfit: o.id })}
              >
                <Shirt size={30} />
                <span>{o.name}</span>
                {draft.outfit === o.id && <Check size={16} />}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {groups.map((g) => (
        <fieldset key={g.key}>
          <legend>{g.label}</legend>
          <div className={styles.swatches}>
            {g.options.map((o) => (
              <button
                key={o.id}
                type="button"
                aria-label={o.name}
                aria-pressed={draft[g.key as keyof Avatar] === o.id}
                onClick={() => setDraft({ ...draft, [g.key]: o.id })}
              >
                <span
                  className={styles.colorChip}
                  style={{ backgroundColor: o.hex }}
                />
                {o.name}
                {draft[g.key as keyof Avatar] === o.id && <Check size={14} />}
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
        Your look is saved on this browser. Clothing changes are free.
      </p>
    </div>
  );
}
