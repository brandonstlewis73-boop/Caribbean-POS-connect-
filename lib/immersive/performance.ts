import {
  BufferAttribute,
  InterleavedBufferAttribute,
  Mesh,
  FloatType,
  HalfFloatType,
  Texture,
  type Object3D,
  type Material,
} from "three";
export class FrameWindow {
  samples: number[] = [];
  reset() {
    this.samples = [];
  }
  add(ms: number) {
    if (Number.isFinite(ms) && ms > 0) this.samples.push(ms);
  }
  report() {
    const sorted = [...this.samples].sort((a, b) => a - b);
    const count = sorted.length;
    const mean = count ? sorted.reduce((a, b) => a + b, 0) / count : 0;
    return {
      fps: mean ? Math.round(1000 / mean) : 0,
      frameMs: mean,
      p50Ms: sorted[Math.floor(count * 0.5)] || 0,
      p95Ms: sorted[Math.min(count - 1, Math.floor(count * 0.95))] || 0,
      samples: count,
    };
  }
}
export type ResolutionState = { scale: number; slow: number; fast: number };
export function adaptResolution(
  state: ResolutionState,
  p95: number,
  targetFps: 30 | 60 = 60,
): ResolutionState {
  const slow = p95 > (targetFps === 30 ? 42 : 34) ? state.slow + 1 : 0;
  const fast =
    p95 > 0 && p95 < (targetFps === 30 ? 35 : 19) ? state.fast + 1 : 0;
  if (slow >= 3)
    return {
      scale: Math.max(0.7, Math.round((state.scale - 0.15) * 100) / 100),
      slow: 0,
      fast: 0,
    };
  if (fast >= 8)
    return {
      scale: Math.min(1, Math.round((state.scale + 0.15) * 100) / 100),
      slow: 0,
      fast: 0,
    };
  return { ...state, slow, fast };
}
// WebGL does not expose total GPU memory. Estimate only owned geometry/textures,
// including mipmaps and the drawing buffers, with shared resources counted once.
export function estimateSceneBytes(scene: Object3D, pixels: number) {
  const buffers = new Set<ArrayBufferLike>(),
    textures = new Set<Texture>();
  scene.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const geometry = object.geometry;
    for (const attr of [
      ...Object.values(geometry.attributes),
      geometry.index,
      ...Object.values(geometry.morphAttributes).flat(),
      (object as Mesh & { instanceMatrix?: BufferAttribute }).instanceMatrix,
      (object as Mesh & { instanceColor?: BufferAttribute }).instanceColor,
    ]) {
      if (attr instanceof InterleavedBufferAttribute)
        buffers.add(attr.data.array.buffer);
      else if (attr instanceof BufferAttribute) buffers.add(attr.array.buffer);
    }
    const materials: Material[] = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials)
      for (const value of Object.values(material))
        if (value instanceof Texture) textures.add(value);
    const bone = (object as Mesh & { skeleton?: { boneTexture?: Texture } })
      .skeleton?.boneTexture;
    if (bone) textures.add(bone);
  });
  const environment = (scene as Object3D & { environment?: Texture })
    .environment;
  if (environment) textures.add(environment);
  let bytes = pixels * 8;
  for (const buffer of buffers) bytes += buffer.byteLength;
  for (const texture of textures) {
    const image = texture.image as
      | { width?: number; height?: number }
      | undefined;
    bytes +=
      (image?.width || 0) *
      (image?.height || 0) *
      (texture.type === FloatType
        ? 16
        : texture.type === HalfFloatType
          ? 8
          : 4) *
      (texture.generateMipmaps ? 4 / 3 : 1);
  }
  return Math.round((bytes / 1048576) * 10) / 10;
}

/** Pace submitted GPU frames without slowing the collision/input simulation. */
export class RenderPacer {
  private next = 0;
  private rate = 0;
  reset() {
    this.next = 0;
    this.rate = 0;
  }
  due(now: number, fps: 30 | 60) {
    const interval = 1000 / fps;
    if (this.rate !== fps) {
      this.rate = fps;
      this.next = now;
    }
    if (now + 0.5 < this.next) return false;
    this.next += interval;
    // Drop missed frames after a stall; never render a burst to catch up.
    if (this.next <= now - 0.5) this.next = now + interval;
    return true;
  }
}
