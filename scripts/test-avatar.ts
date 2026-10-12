import assert from "node:assert/strict";
import { MeshStandardMaterial, MeshLambertMaterial, Texture } from "three";
import {
  DEFAULT_AVATAR,
  normalizeAvatar,
  readAvatar,
  saveAvatar,
} from "../lib/immersive/avatar";
import { dressMaterial } from "../lib/immersive/wardrobe";
assert.deepEqual(
  normalizeAvatar({ character: "../bad", top: "javascript:", trousers: null }),
  DEFAULT_AVATAR,
);
assert.deepEqual(readAvatar({ getItem: () => "{broken" }), DEFAULT_AVATAR);
assert.deepEqual(
  readAvatar({
    getItem: () => {
      throw Error("denied");
    },
  }),
  DEFAULT_AVATAR,
);
assert.equal(
  saveAvatar(
    {
      setItem: () => {
        throw Error("denied");
      },
    },
    DEFAULT_AVATAR,
  ),
  false,
);
let saved = "";
assert.ok(
  saveAvatar(
    {
      setItem: (_key, value) => {
        saved = value;
      },
    },
    { ...DEFAULT_AVATAR, character: "knit", top: "clay" },
  ),
);
assert.equal(readAvatar({ getItem: () => saved }).character, "knit");
const texture = new Texture();
for (const name of [
  "human_top",
  "human_trousers",
  "human_skin",
  "human_shoes",
  "f017_head",
]) {
  const source = new MeshStandardMaterial({ map: texture });
  source.name = name;
  const dressed = dressMaterial(source, {
    character: "knit",
    top: "clay",
    trousers: "dark",
  }) as MeshStandardMaterial;
  assert.notEqual(dressed, source, "never mutate shared cached materials");
  assert.equal(source.color.getHex(), 0xffffff);
  assert.equal(
    dressed.map,
    texture,
    "preserve authored fabric and face textures",
  );
  if (name === "human_top" || name === "human_trousers")
    assert.notEqual(dressed.color.getHex(), 0xffffff);
  else
    assert.equal(
      dressed.color.getHex(),
      0xffffff,
      "skin, hair and footwear must not receive clothing tint",
    );
  dressed.dispose();
  source.dispose();
}
texture.dispose();
console.log(
  "PASS character preference validation, persistence, denied storage, material immutability and isolated clothing tints",
);

const skin = new MeshStandardMaterial({ map: new Texture(), alphaTest: 0.35 });
skin.name = "human_skin";
const light = dressMaterial(skin, DEFAULT_AVATAR, true);
assert.ok(
  light instanceof MeshLambertMaterial,
  "light graphics use cheaper lighting",
);
assert.equal(
  light.map,
  skin.map,
  "light graphics retain the authored skin texture",
);
assert.equal(light.alphaTest, 0.35, "preserve hair cutout boundaries");
assert.equal(light.color.getHex(), skin.color.getHex());
light.dispose();
skin.map!.dispose();
skin.dispose();
console.log("PASS lighter textured materials and alpha preservation");
