# vgpu

<p>
  <a href="https://vercel.com/labs#labs-products"><img alt="Vercel Labs Product" src="https://img.shields.io/badge/LABS-PRODUCT-0a0a0a.svg?style=for-the-badge&amp;logo=Vercel&amp;labelColor=000000" height="28"></a>
  <a href="https://www.npmjs.com/package/vgpu"><img alt="npm version: vgpu" src="https://img.shields.io/npm/v/vgpu.svg?style=for-the-badge&amp;labelColor=000000" height="28"></a>
  <a href="https://github.com/vercel-labs/vgpu/blob/canary/LICENSE"><img alt="License: MIT" src="https://img.shields.io/github/license/vercel-labs/vgpu.svg?style=for-the-badge&amp;labelColor=000000" height="28"></a>
  <a href="https://www.npmjs.com/package/vgpu"><img alt="npm downloads per month: vgpu" src="https://img.shields.io/npm/dm/vgpu.svg?style=for-the-badge&amp;labelColor=000000&amp;label=npm%20downloads" height="28"></a>
  <a href="https://github.com/vercel-labs/vgpu/actions/workflows/ci.yml"><img alt="CI status" src="https://img.shields.io/github/actions/workflow/status/vercel-labs/vgpu/ci.yml?branch=canary&amp;style=for-the-badge&amp;labelColor=000000&amp;label=CI&amp;logo=github" height="28"></a>
</p>

vgpu 是一个面向 WebGPU 的 TypeScript 库：提供带类型的着色器导入、极简的 GPU 优先 API，同一份代码可在浏览器、无头 Node 以及测试套件中运行。

- **带类型的 WGSL 导入。** `.wgsl` 文件像 TypeScript 模块一样导入和导出，反射机制会自动保持绑定名称、类型与布局的正确性，无需手写声明。
- **唯一的 `Gpu` 上下文。** `init()` 返回一个统一句柄；每个入口点（`draw`、`effect`、`frame`、`surface`、`target` ……）都以它为第一个参数，没有隐藏的全局状态。
- **为精简而设计。** 未使用的声明在压缩前会被剪除，一个完整的全屏效果压缩后仅 25 KB（gzip）——这一体积预算由 CI 强制把关。
- **默认多运行时。** 浏览器、无头 Node（`vgpu/node`，基于 Dawn）以及为测试和 CI 构建的确定性 mock（`vgpu/mock`）共用同一套公开 API。
- **显式帧。** `frame(gpu, (f) => f.pass(target, effect))` —— 通道、清屏与绘制都是显式调用，绝不存在隐式的场景图状态。
- **面向 Agent。** 文档、示例画廊与着色器校验均可通过 CLI 运行（`npx vgpu docs`、`npx vgpu examples`、`npx vgpu check`），[vgpu.sh](https://vgpu.sh) 还发布了供 LLM 消费的 `agents.md` 与 `llms.txt`。

**完整文档与示例请访问 [vgpu.sh](https://vgpu.sh)。**

## 快速开始

```bash
pnpm add vgpu
pnpm add -D @webgpu/types
```

```ts
import { clock, init, effect, frameLoop, surface } from "vgpu";
import waveShader from "./wave.wgsl";

const gpu = await init();
const canvasSurface = surface(gpu, canvas, { dpr: [1, 2] });
const wave = effect(gpu, waveShader, { set: { speed: 2 } });

const time = clock(gpu);
frameLoop(gpu, (frame) => {
  wave.set({ time: time.time });
  frame.pass(canvasSurface, wave);
});
```

在这个例子中，`init()` 获取适配器与设备并返回唯一的 `Gpu` 上下文；其余入口点都以它为第一个参数。`surface` 将画布封装为渲染目标并保持其尺寸同步，同时把设备像素比限制在 1 到 2 之间。`effect` 将着色器编译为全屏效果，其 uniform 可通过 WGSL 名称经由 `set()` 寻址——写入立即生效，因此循环中只需设置每帧变化的部分。`clock` 提供帧时间，`frameLoop` 每帧运行一次回调，在其中由 `frame.pass` 将效果绘制到表面。

### Node 快速开始

同一套 API 也可在无头环境下针对 Dawn 支撑的设备运行：

```ts
import { draw, frame, init, target } from "vgpu/node";
import triangleShader from "./triangle.wgsl";

const gpu = await init();
const colorTarget = target(gpu, { size: [256, 256], format: "rgba8unorm" });
const triangle = draw(gpu, { shader: triangleShader });

frame(gpu, (f) => f.pass(colorTarget, triangle));
const pixels = await colorTarget.read();
gpu.dispose();
```

`vgpu/mock` 会为同一份代码换上确定性的软件适配器，因此测试永远不需要真实 GPU。

## 带类型导入的 WGSL 模块

`.wgsl` 文件像 TypeScript 模块一样导入和导出。`@vgpu/wgsl-std` 以具名导出形式提供可复用的声明（哈希、噪声、颜色、采样 ……），任何 `.wgsl` 文件也都可以导出自己的 `fn`、`struct` 或 `const` 供其他着色器导入：

```wgsl
// grain.wgsl
import { hash2 } from "@vgpu/wgsl-std/hash";

export fn grain(uv: vec2f, time: f32) -> f32 {
  return hash2(uv * time).x;
}
```

导入在构建期通过带类型的 WGSL 反射解析——无需代码生成步骤，也无需手写绑定声明来手动同步。

## 文档

完整文档托管于 [vgpu.sh](https://vgpu.sh)。先从 [入门指南](https://vgpu.sh/docs/get-started) 开始，再阅读 [性能实践手册](https://vgpu.sh/docs/guides/performance-playbook)，了解着色器作者从第一天就应遵循的默认做法（打包、目标预预热、原地 `set()`、实例化、乒乓缓冲、MSAA/深度）。[交互式示例](https://vgpu.sh/examples) 可在浏览器中运行，其源码正是由 `vgpu examples` 提供的那一份。

同样的指南与 API 参考也随包发布，可通过 CLI 完全离线运行：

```bash
npx vgpu docs cat getting-started.md
npx vgpu docs find effect
```

## Agent 资源

vgpu 既能由人操作，也能由编码 Agent 操作。示例画廊可从 CLI 检索，任何示例的完整源码都无需克隆仓库即可复制到本地：

```bash
npx vgpu examples search "raymarching"
npx vgpu examples pull <id> --out ./example
```

支持 skill 的 Agent 可安装 vgpu 的轻量文档路由。该 skill 不含带版本的 API 参考，它查询的是项目中已安装的 `vgpu` 版本所捆绑的文档。

```bash
npx skills add vercel-labs/vgpu
```

- [Agent 就绪清单](https://vgpu.sh/agents.md) —— Agent 应如何发现并使用 vgpu
- [llms.txt](https://vgpu.sh/llms.txt) 与 [llms-full.txt](https://vgpu.sh/llms-full.txt) —— 面向 LLM 的文档索引与完整导出
- [示例发现 API](https://vgpu.sh/docs/examples-api) —— 无需令牌、只读，由 [OpenAPI](https://vgpu.sh/openapi.json) 描述
- [MCP 指南](https://vgpu.sh/docs/mcp) —— 将 Agent 接入公开只读端点 `https://vgpu.sh/api/mcp`，或运行本地 stdio 以使用与包版本对应的文档及可选示例下载

```bash
npx vgpu mcp
npx vgpu mcp --project-from-cwd
```

## 包

这是一个 monorepo。公开入口是 `vgpu`，其余部分要么支撑它，要么独立发布。

| 包 | 说明 |
| --- | --- |
| [`vgpu`](https://github.com/vercel-labs/vgpu/blob/canary/packages/vgpu-api/README.md) | 公开主 API：`init`、`draw`、`compute`、`effect`、`frame`、`bundle`、`target`、`uniforms`，以及 `scene` 与 `core` 子路径。 |
| [`@vgpu/cli`](https://github.com/vercel-labs/vgpu/blob/canary/packages/vgpu/README.md) | `vgpu` 命令行二进制：文档、着色器 `check`、`doctor`，以及 Dawn/软件渲染器配置。 |
| [`@vgpu/core`](https://github.com/vercel-labs/vgpu/blob/canary/packages/core/README.md) | `vgpu/core` 背后的底层 WebGPU 封装（`Device`、`Buffer`、`Texture`、绑定组）。 |
| [`@vgpu/wgsl`](https://github.com/vercel-labs/vgpu/blob/canary/packages/wgsl/README.md) | 在打包前将 `.wgsl` 文件转换为 JS 模块，并解析 WGSL 到 WGSL 的导入。 |
| [`@vgpu/wgsl-std`](https://github.com/vercel-labs/vgpu/blob/canary/packages/wgsl-std/README.md) | 标准 WGSL 工具模块（数学、颜色、采样、噪声、哈希 ……）。 |
| [`@vgpu/adapter-node`](https://github.com/vercel-labs/vgpu/blob/canary/packages/adapter-node/README.md) | `vgpu/node` 使用的 Dawn 支撑适配器。 |
| [`@vgpu/adapter-mock`](https://github.com/vercel-labs/vgpu/blob/canary/packages/adapter-mock/README.md) | `vgpu/mock` 使用的确定性 mock 适配器。 |
| [`@vgpu/render`](https://github.com/vercel-labs/vgpu/blob/canary/packages/render/README.md) | 位于主渲染表面之外、轻量的编辑/检查/工具/性能辅助模块。 |

## 贡献

开发环境搭建、体积预算与发布流程请参阅 [CONTRIBUTING.md](https://github.com/vercel-labs/vgpu/blob/canary/CONTRIBUTING.md)。

## 许可证

MIT —— 详见 [LICENSE](https://github.com/vercel-labs/vgpu/blob/canary/LICENSE)。
