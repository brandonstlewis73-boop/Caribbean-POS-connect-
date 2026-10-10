// In-place clip travel estimated from the normalized rig's foot excursion.
// These are gait calibration values, not a promise of foot-lock IK.
export const WALK_CYCLE_SECONDS = 1.333333;
export const RUN_CYCLE_SECONDS = 0.933333;
export const WALK_STRIDE = 1.284;
export const RUN_STRIDE = 2.35;
export const PICKUP_SECONDS = 0.833333;
const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));
const smooth = (v: number) => {
  const t = clamp(v, 0, 1);
  return t * t * (3 - 2 * t);
};
export function gait(speed: number) {
  const moving = smooth(speed / 0.22);
  const run = smooth((speed - 1.85) / 1.05);
  const stride = WALK_STRIDE * (1 - run) + RUN_STRIDE * run;
  return {
    idle: 1 - moving,
    walk: moving * (1 - run),
    run: moving * run,
    cyclesPerSecond: speed / stride,
  };
}
export function pickupWeight(time: number) {
  if (time < 0 || time >= PICKUP_SECONDS) return 0;
  return smooth(time / 0.16) * smooth((PICKUP_SECONDS - time) / 0.22);
}
export function advancePhase(phase: number, speed: number, dt: number) {
  return (phase + gait(speed).cyclesPerSecond * Math.max(0, dt)) % 1;
}
