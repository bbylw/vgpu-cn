import { useEffect, useRef, useState } from 'react';
import { init, clock, effect, frameLoop, surface } from 'vgpu';

interface Props {
  shader: string;
  initialSet: Record<string, unknown>;
  label: string;
}

export default function ShaderStage({ shader, initialSet, label }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let loop: { stop(): void } | null = null;
    let disposed = false;
    (async () => {
      try {
        if (!navigator.gpu) throw new Error('当前浏览器不支持 WebGPU');
        const gpu = await init();
        if (disposed || !canvasRef.current) return;
        const canvasSurface = surface(gpu, canvasRef.current, { dpr: [1, 2] });
        const fx = effect(gpu, shader, { set: initialSet });
        const time = clock(gpu);
        loop = frameLoop(gpu, (frame) => {
          fx.set({ params: { time: time.time } });
          frame.pass(canvasSurface, fx);
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      disposed = true;
      loop?.stop();
    };
  }, [shader]);

  if (error) {
    return <div className="flex aspect-video items-center justify-center text-sm text-neutral-500">{error}</div>;
  }
  return (
    <>
      <canvas ref={canvasRef} className="aspect-video w-full" aria-label={label} />
      <div className="p-4 text-sm text-neutral-400">
        <span className="mr-2 inline-block h-2 w-2 rounded-full bg-accent align-middle" />
        实时渲染 — vgpu effect + frameLoop，运行在你的 GPU 上
      </div>
    </>
  );
}
