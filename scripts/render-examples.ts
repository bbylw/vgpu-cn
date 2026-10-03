// 使用真实 vgpu/node（Dawn）在无头环境渲染示例帧，输出 PNG。
// 用法: node --experimental-strip-types scripts/render-examples.ts
// 注意: Dawn 原生模块在 Bun 下崩溃，必须用 node 运行。
import { PNG } from 'pngjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { init, target, effect } from 'vgpu/node';
import { voronoiShader, nebulaShader, gyroidShader } from '../src/components/shaders.ts';

const W = 640;
const H = 360;

const jobs: Array<[string, string, number]> = [
  ['voronoi', voronoiShader, 3.0],
  ['nebula', nebulaShader, 6.0],
  ['gyroid', gyroidShader, 2.5],
];

const gpu = await init();
for (const [name, src, time] of jobs) {
  const colorTarget = target(gpu, { size: [W, H] });
  const fx = effect(gpu, src, { set: { params: { time } } });
  fx.draw(colorTarget);
  const pixels = await colorTarget.color.read({ mipLevel: 0, region: 'all' });
  const png = new PNG({ width: W, height: H });
  png.data = Buffer.from(pixels);
  mkdirSync('public/examples', { recursive: true });
  writeFileSync(`public/examples/${name}.png`, PNG.sync.write(png));
  console.log(`wrote public/examples/${name}.png (${pixels.length} bytes read)`);
  colorTarget.destroy();
}
gpu.dispose();
