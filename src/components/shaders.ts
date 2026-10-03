export const voronoiShader = `
struct Params { time: f32 }
@group(0) @binding(0) var<uniform> params: Params;

fn hash22(p: vec2f) -> vec2f {
  let h = vec2f(dot(p, vec2f(127.1, 311.7)), dot(p, vec2f(269.5, 183.3)));
  return fract(sin(h) * 43758.5453);
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  var p = vec2f(uv.x * 2.0 - 1.0, uv.y * 2.0 - 1.0);
  p.x *= 16.0 / 9.0;
  p *= 2.6;
  let ip = floor(p);
  let fp = fract(p);
  var md = 8.0;
  var mg = vec2f(0.0);
  for (var y = -1; y <= 1; y++) {
    for (var x = -1; x <= 1; x++) {
      let g = vec2f(f32(x), f32(y));
      var o = hash22(ip + g);
      o = 0.5 + 0.42 * sin(params.time * 0.7 + 6.2831 * o);
      let r = g + o - fp;
      let d = dot(r, r);
      if (d < md) { md = d; mg = g; }
    }
  }
  md = sqrt(md);
  let h = hash22(ip + mg).x;
  var cell = 0.5 + 0.5 * cos(params.time * 0.25 + 6.2831 * h + vec3f(0.0, 2.1, 4.2));
  cell = mix(vec3f(0.08, 0.06, 0.06), vec3f(1.0, 0.55, 0.2), cell * (0.25 + 0.75 * h));
  let border = 1.0 - smoothstep(0.0, 0.12, md);
  var col = cell * (1.0 - border * 0.6) + vec3f(1.0, 0.85, 0.6) * border * 0.9;
  col *= 1.0 - dot(p * 0.16, p * 0.16);
  return vec4f(col, 1.0);
}`;

export const nebulaShader = `
struct Params { time: f32 }
@group(0) @binding(0) var<uniform> params: Params;

fn hash22(p: vec2f) -> vec2f {
  let h = vec2f(dot(p, vec2f(127.1, 311.7)), dot(p, vec2f(269.5, 183.3)));
  return fract(sin(h) * 43758.5453);
}

fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash22(i).x, hash22(i + vec2f(1.0, 0.0)).x, u.x),
             mix(hash22(i + vec2f(0.0, 1.0)).x, hash22(i + vec2f(1.0, 1.0)).x, u.x), u.y);
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

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  var p = vec2f(uv.x * 2.0 - 1.0, uv.y * 2.0 - 1.0);
  p.x *= 16.0 / 9.0;
  let t = params.time * 0.08;
  let q = vec2f(fbm(p * 1.5 + t), fbm(p * 1.5 + vec2f(5.2, 1.3) - t));
  let f = fbm(p * 1.5 + q * 2.0 + vec2f(1.7 - t, 9.2));
  var col = mix(vec3f(0.05, 0.04, 0.05), vec3f(0.55, 0.2, 0.08), clamp(f * f * 3.0, 0.0, 1.0));
  col = mix(col, vec3f(0.95, 0.55, 0.25), clamp(pow(f, 3.0) * 4.0, 0.0, 1.0));
  col = mix(col, vec3f(1.0, 0.9, 0.75), clamp(pow(f, 8.0) * 5.0, 0.0, 1.0));
  // stars
  let cell = floor(p * 60.0);
  let s = hash22(cell).x;
  if (s > 0.992) {
    col += vec3f(1.0) * (0.5 + 0.5 * sin(params.time * 2.0 + s * 50.0)) * 0.7;
  }
  let vig = 1.0 - dot(p * 0.45, p * 0.45);
  return vec4f(col * clamp(vig, 0.0, 1.0), 1.0);
}`;

export const gyroidShader = `
struct Params { time: f32 }
@group(0) @binding(0) var<uniform> params: Params;

fn map(p: vec3f) -> f32 {
  let q = p * 2.2;
  let g = abs(dot(sin(q), cos(q.yzx))) * 0.5 / 2.2 - 0.04;
  return max(g, length(p) - 1.3);
}

fn calcNormal(p: vec3f) -> vec3f {
  let e = 0.002;
  let h = vec2f(1.0, -1.0);
  return normalize(h.xyy * map(p + h.xyy * e) + h.yyx * map(p + h.yyx * e) +
                   h.yxy * map(p + h.yxy * e) + h.xxx * map(p + h.xxx * e));
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  var p = vec2f(uv.x * 2.0 - 1.0, uv.y * 2.0 - 1.0);
  p.x *= 16.0 / 9.0;
  let t = params.time * 0.3;
  let ro = vec3f(sin(t) * 2.1, sin(t * 0.6) * 1.0, cos(t) * 2.1);
  let ta = vec3f(0.0);
  let fw = normalize(ta - ro);
  let rt = normalize(cross(fw, vec3f(0.0, 1.0, 0.0)));
  let up = cross(rt, fw);
  let rd = normalize(p.x * rt + p.y * up + 1.4 * fw);
  var tt = 0.0;
  var hit = false;
  for (var i = 0; i < 72; i++) {
    let d = map(ro + rd * tt);
    if (d < 0.0015) { hit = true; break; }
    tt += d * 0.9;
    if (tt > 8.0) { break; }
  }
  var col = vec3f(0.05, 0.045, 0.045);
  if (hit) {
    let pos = ro + rd * tt;
    let n = calcNormal(pos);
    let light = normalize(vec3f(0.6, 0.8, 0.7));
    let diff = max(dot(n, light), 0.0);
    let fres = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
    col = vec3f(0.85, 0.45, 0.2) * (0.15 + 0.85 * diff) + vec3f(1.0, 0.7, 0.4) * fres * 0.6;
    col *= exp(-tt * 0.12);
  }
  return vec4f(col, 1.0);
}`;
