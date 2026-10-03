export const voronoiShader = `
struct Params { time: f32 }
@group(0) @binding(0) var<uniform> params: Params;

fn hash22(p: vec2f) -> vec2f {
  let h = vec2f(dot(p, vec2f(127.1, 311.7)), dot(p, vec2f(269.5, 183.3)));
  return fract(sin(h) * 43758.5453);
}

fn grain(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(41.3, 289.1))) * 23758.5453);
}

fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(mix(grain(i), grain(i + vec2f(1.0, 0.0)), u.x),
             mix(grain(i + vec2f(0.0, 1.0)), grain(i + vec2f(1.0, 1.0)), u.x), u.y);
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let sp = vec2f(uv.x * 2.0 - 1.0, uv.y * 2.0 - 1.0);
  var p = sp;
  p.x *= 16.0 / 9.0;
  p *= 3.0;
  let w = vec2f(noise(p * 1.7 + params.time * 0.10), noise(p * 1.7 + vec2f(31.7, 7.3) - params.time * 0.08));
  p += (w - 0.5) * 0.45;
  let ip = floor(p);
  let fp = fract(p);
  var d1 = 8.0;
  var d2 = 8.0;
  var mg = vec2f(0.0);
  var mo = vec2f(0.0);
  for (var y = -1; y <= 1; y++) {
    for (var x = -1; x <= 1; x++) {
      let g = vec2f(f32(x), f32(y));
      var o = hash22(ip + g);
      o = 0.5 + 0.44 * sin(params.time * 0.55 + 6.2831 * o + vec2f(0.0, 1.9));
      let d = length(g + o - fp);
      if (d < d1) { d2 = d1; d1 = d; mg = g; mo = o; } else if (d < d2) { d2 = d; }
    }
  }
  let h = hash22(ip + mg).x;
  let h2 = hash22(ip + mg + 7.3).x;
  let gran = noise(p * 9.0 + params.time * 0.15);
  var col = mix(vec3f(0.16, 0.07, 0.05), vec3f(0.42, 0.18, 0.10), h * h);
  col *= 0.80 + 0.40 * gran;
  col *= 0.90 + 0.10 * sin(params.time * 0.5 + h * 6.2831);
  let nc = fp - (mg + mo) - (vec2f(h, h2) - 0.5) * 0.22;
  let nd = length(nc);
  let nr = 0.14 + 0.16 * h2 + 0.02 * sin(params.time * 0.8 + h * 6.2831);
  let nucleus = 1.0 - smoothstep(nr, nr + 0.18, nd);
  let envelope = nucleus * (0.55 + 0.45 * smoothstep(nr * 0.45, nr, nd));
  let nucleolus = 1.0 - smoothstep(0.04, 0.085, nd);
  col *= 0.75 + 0.45 * (1.0 - smoothstep(0.0, 0.9, nd));
  col = mix(col, vec3f(0.58, 0.24, 0.12), envelope * 0.8);
  col += vec3f(1.0, 0.62, 0.34) * nucleolus * nucleus * 0.5;
  let edge = d2 - d1;
  col *= 0.35 + 0.65 * smoothstep(0.0, 0.22, edge);
  let mem = 1.0 - smoothstep(0.0, 0.055, edge);
  let halo = 1.0 - smoothstep(0.0, 0.22, edge);
  col += vec3f(1.0, 0.72, 0.44) * mem * mem * 1.0;
  col += vec3f(0.85, 0.38, 0.20) * halo * halo * 0.10;
  col *= clamp(1.0 - 0.16 * dot(sp, sp), 0.0, 1.0);
  return vec4f(col, 1.0);
}`;

export const nebulaShader = `
struct Params { time: f32 }
@group(0) @binding(0) var<uniform> params: Params;

fn hash21(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2f(1.0, 0.0)), u.x),
             mix(hash21(i + vec2f(0.0, 1.0)), hash21(i + vec2f(1.0, 1.0)), u.x), u.y);
}

fn fbm(p: vec2f) -> f32 {
  var v = 0.0;
  var a = 0.5;
  var q = p;
  for (var i = 0; i < 5; i++) {
    v += a * noise(q);
    q = q * 2.03 + vec2f(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

fn stars(p: vec2f, cutoff: f32) -> f32 {
  let ip = floor(p);
  let fp = fract(p);
  let h = hash21(ip);
  if (h < cutoff) { return 0.0; }
  let pos = vec2f(hash21(ip + 3.1), hash21(ip + 7.7));
  let d = length(fp - pos);
  let tw = 0.55 + 0.45 * sin(params.time * 1.8 + h * 80.0);
  return (1.0 - smoothstep(0.0, 0.30, d)) * tw * (h - cutoff) / (1.0 - cutoff);
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let sp = vec2f(uv.x * 2.0 - 1.0, uv.y * 2.0 - 1.0);
  var p = sp;
  p.x *= 16.0 / 9.0;
  let t = params.time * 0.06;
  let q = vec2f(fbm(p * 1.4 + vec2f(0.0, t)), fbm(p * 1.4 + vec2f(5.2, 1.3) - t));
  let f = fbm(p * 1.6 + q * 2.2 + vec2f(1.7, 9.2));
  let m = clamp((f - 0.28) / 0.52, 0.0, 1.0);
  var col = vec3f(0.016, 0.013, 0.012);
  col = mix(col, vec3f(0.20, 0.07, 0.038), smoothstep(0.05, 0.55, m));
  col = mix(col, vec3f(0.68, 0.28, 0.12), smoothstep(0.45, 0.80, m));
  col = mix(col, vec3f(1.0, 0.78, 0.52), smoothstep(0.78, 0.98, m));
  col += vec3f(1.0, 0.90, 0.76) * stars(p * 64.0, 0.90) * 0.9;
  col += vec3f(1.0, 0.82, 0.62) * stars(p * 128.0 + 11.0, 0.94) * 0.35;
  col *= clamp(1.0 - 0.20 * dot(sp, sp), 0.0, 1.0);
  return vec4f(col, 1.0);
}`;

export const gyroidShader = `
struct Params { time: f32 }
@group(0) @binding(0) var<uniform> params: Params;

fn map(p: vec3f) -> f32 {
  let q = p * 12.0;
  let g = dot(sin(q), cos(q.yzx));
  let shell = abs(g) / 17.4 - 0.02;
  return max(shell, length(p) - 1.5);
}

fn calcNormal(p: vec3f) -> vec3f {
  let e = 0.001;
  let h = vec2f(1.0, -1.0);
  return normalize(h.xyy * map(p + h.xyy * e) + h.yyx * map(p + h.yyx * e) +
                   h.yxy * map(p + h.yxy * e) + h.xxx * map(p + h.xxx * e));
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let sp = vec2f(uv.x * 2.0 - 1.0, uv.y * 2.0 - 1.0);
  var p = sp;
  p.x *= 16.0 / 9.0;
  let t = params.time * 0.15;
  let a = t * 0.35;
  let ro = vec3f(cos(a) * 5.2, 1.4 + 0.5 * sin(a * 0.7), sin(a) * 5.2);
  let fw = normalize(-ro);
  let rt = normalize(cross(fw, vec3f(0.0, 1.0, 0.0)));
  let up = cross(rt, fw);
  let rd = normalize(p.x * rt + p.y * up + 2.6 * fw);
  var tt = 0.0;
  var hit = false;
  for (var i = 0; i < 128; i++) {
    let d = map(ro + rd * tt);
    if (d < 0.0008) { hit = true; break; }
    tt += d;
    if (tt > 8.0) { break; }
  }
  let bg = vec3f(0.045, 0.034, 0.030) + vec3f(0.06, 0.024, 0.012) * pow(max(0.0, 1.0 - abs(rd.y)), 4.0);
  var col = bg;
  if (hit) {
    let pos = ro + rd * tt;
    var n = calcNormal(pos);
    if (dot(n, rd) > 0.0) { n = -n; }
    var occ = 0.0;
    var sca = 1.0;
    for (var i = 0; i < 4; i++) {
      let d = 0.01 + 0.09 * f32(i) / 3.0;
      occ += (d - map(pos + n * d)) * sca;
      sca *= 0.65;
    }
    let ao = clamp(1.0 - 1.6 * occ, 0.0, 1.0);
    let l1 = normalize(vec3f(0.7, 0.9, 0.4));
    let diff = max(dot(n, l1), 0.0);
    let hv = normalize(l1 - rd);
    let spec = pow(max(dot(n, hv), 0.0), 28.0);
    let fres = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
    col = vec3f(0.78, 0.40, 0.20) * diff * vec3f(1.0, 0.62, 0.34)
        + vec3f(0.78, 0.40, 0.20) * vec3f(0.18, 0.11, 0.09) * ao
        + vec3f(1.0, 0.72, 0.45) * spec * 0.35
        + vec3f(1.0, 0.48, 0.24) * fres * 0.30;
    col = mix(col, bg, 1.0 - exp(-0.004 * tt * tt));
  }
  return vec4f(col, 1.0);
}`;
