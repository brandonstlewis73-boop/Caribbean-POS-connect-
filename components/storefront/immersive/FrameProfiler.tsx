"use client";
import { useEffect, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { FrameWindow, estimateSceneBytes } from "@/lib/immersive/performance";
import type { Body } from "@/lib/immersive/world";
import type { SceneStats } from "./Scene";
type TimerExtension = { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number };
export function FrameProfiler({
  body,
  paused,
  onStats,
  onReady,
  onError,
  startedAt,
}: {
  body: MutableRefObject<Body>;
  paused: boolean;
  onStats: (stats: SceneStats) => void;
  onReady: () => void;
  onError: () => void;
  startedAt?: number;
}) {
  const { gl, scene, camera } = useThree();
  const window = useRef(new FrameWindow()),
    skip = useRef(true),
    ready = useRef(false);
  const started = useRef(startedAt ?? performance.now()),
    lastReport = useRef(0),
    loadedMs = useRef(0);
  const frameCount = useRef(0);
  const query = useRef<WebGLQuery | null>(null),
    gpuMs = useRef<number | null>(null);
  const ctx = gl.getContext() as WebGL2RenderingContext;
  const extension = useRef<TimerExtension | null>(null);
  useEffect(() => {
    extension.current = ctx.getExtension("EXT_disjoint_timer_query_webgl2");
    return () => {
      if (query.current) ctx.deleteQuery(query.current);
    };
  }, [ctx]);
  useEffect(() => {
    skip.current = true;
    window.current.reset();
    lastReport.current = performance.now();
  }, [paused]);
  useFrame((_, delta) => {
    if (document.hidden) return;
    const ext = extension.current;
    if (
      query.current &&
      ext &&
      ctx.getQueryParameter(query.current, ctx.QUERY_RESULT_AVAILABLE)
    ) {
      gpuMs.current = ctx.getParameter(ext.GPU_DISJOINT_EXT)
        ? null
        : ctx.getQueryParameter(query.current, ctx.QUERY_RESULT) / 1e6;
      ctx.deleteQuery(query.current);
      query.current = null;
    }
    let measuring = false;
    if (!paused && ext && !query.current && ++frameCount.current % 30 === 0) {
      query.current = ctx.createQuery();
      if (query.current) {
        ctx.beginQuery(ext.TIME_ELAPSED_EXT, query.current);
        measuring = true;
      }
    }
    try {
      gl.render(scene, camera);
    } catch {
      onError();
      return;
    } finally {
      if (measuring && ext) ctx.endQuery(ext.TIME_ELAPSED_EXT);
    }
    if (!ready.current) {
      ready.current = true;
      loadedMs.current = performance.now() - started.current;
      onReady();
    }
    if (paused) return;
    if (skip.current) {
      skip.current = false;
      lastReport.current = performance.now();
      return;
    }
    window.current.add(delta * 1000);
    if (performance.now() - lastReport.current < 1500) return;
    const resources = performance.getEntriesByType(
      "resource",
    ) as PerformanceResourceTiming[];
    const asset = resources.filter((r) =>
      r.name.includes("/storefront/immersive/"),
    );
    onStats({
      ...window.current.report(),
      calls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      x: body.current.x,
      z: body.current.z,
      speed: body.current.speed,
      gpuMs: gpuMs.current,
      estimatedMB: estimateSceneBytes(
        scene,
        gl.domElement.width * gl.domElement.height,
      ),
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
      renderWidth: gl.domElement.width,
      renderHeight: gl.domElement.height,
      assetBytes: asset.reduce((n, r) => n + r.decodedBodySize, 0),
      assetMs: Math.max(0, ...asset.map((r) => r.duration)),
      firstRenderMs: loadedMs.current,
    });
    window.current.reset();
    lastReport.current = performance.now();
  }, 1);
  return null;
}
