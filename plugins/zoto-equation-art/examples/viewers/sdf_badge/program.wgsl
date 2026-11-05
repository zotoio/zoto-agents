struct Uni { a: vec4<f32>, b: vec4<f32>, dom: vec4<f32> };
@group(0) @binding(0) var<uniform> U: Uni;
@group(0) @binding(1) var tex: texture_2d<f32>;
@group(0) @binding(2) var samp: sampler;
struct VOut { @builtin(position) pos: vec4<f32> };
@vertex fn vs(@builtin(vertex_index) i: u32) -> VOut {
  var xy = array<vec2<f32>, 3>(vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0));
  var o: VOut; o.pos = vec4<f32>(xy[i], 0.0, 1.0); return o;
}
var<private> FRAG: vec2<f32>;

fn eqart(p: vec2<f32>) -> vec3<f32> {
  var v0: f32 = (p.x - 0.25);
  var v1: f32 = p.y;
  var v2: f32 = 0.35;
  var v3: f32 = (length(vec2<f32>(v0, v1)) - v2);
  var v4: f32 = (p.x + 0.25);
  var v5: f32 = p.y;
  var v6: f32 = 0.25;
  var v7: f32 = 0.25;
  var v8: f32 = (abs(v4) - v6);
  var v9: f32 = (abs(v5) - v7);
  var v10: f32 = (length(vec2<f32>(max(v8, 0.0), max(v9, 0.0))) + min(max(v8, v9), 0.0));
  var v11: f32 = 0.15;
  var v12: f32 = clamp((0.5 + ((0.5 * (v10 - v3)) / v11)), 0.0, 1.0);
  var v13: f32 = ((v10 + (v3 - v10) * v12) - ((v11 * v12) * (1.0 - v12)));
  var v14: f32 = p.x;
  var v15: f32 = p.y;
  var v16: f32 = 0.85;
  var v17: f32 = exp(-exp(clamp(300.0 * (abs((length(vec2<f32>(v14, v15)) - v16)) - 0.04), -60.0, 60.0)));
  var v18: f32 = exp(-exp(clamp(200.0 * v13, -60.0, 60.0)));
  return ((((vec3<f32>(0.08, 0.09, 0.12) * vec3<f32>((1.0 - v18))) * vec3<f32>((1.0 - v17))) + (vec3<f32>(0.95, 0.55, 0.2) * vec3<f32>(v18))) + ((vec3<f32>(0.3, 0.7, 0.9) * vec3<f32>(v17)) * vec3<f32>((1.0 - v18))));
}

fn luma(c: vec3<f32>) -> f32 { return dot(clamp(c, vec3<f32>(0.0), vec3<f32>(1.0)), vec3<f32>(0.299, 0.587, 0.114)); }
fn hgt(p: vec2<f32>) -> f32 {
  return 0.18 * luma(eqart(p));
}
@fragment fn fs(@builtin(position) fc: vec4<f32>) -> @location(0) vec4<f32> {
  FRAG = fc.xy;
  _ = textureSampleLevel(tex, samp, vec2<f32>(0.5, 0.5), 0.0); // keep bindings 1-2 in the auto layout
  let res = U.a.xy;
  let frag = vec2<f32>(fc.x / res.x, 1.0 - fc.y / res.y);
  if (U.a.z < 0.5) {
    let p = vec2<f32>(U.dom.x + (frag.x - 0.5) * 2.0 * U.dom.z, U.dom.y + (frag.y - 0.5) * 2.0 * U.dom.w);
    return vec4<f32>(clamp(eqart(p), vec3<f32>(0.0), vec3<f32>(1.0)), 1.0);
  }
  let yaw = U.b.x; let pitch = U.b.y; let dist = U.b.z;
  let R = max(U.dom.z, U.dom.w);
  let tgt = vec3<f32>(U.dom.x, 0.0, U.dom.y);
  let ro = tgt + dist * R * vec3<f32>(cos(pitch) * sin(yaw), sin(pitch), cos(pitch) * cos(yaw));
  let fw = normalize(tgt - ro); let rt = normalize(cross(fw, vec3<f32>(0.0, 1.0, 0.0))); let up = cross(rt, fw);
  let q = vec2<f32>(fc.x - 0.5 * res.x, 0.5 * res.y - fc.y) / res.y;
  let rd = normalize(fw * 1.6 + rt * q.x + up * q.y);
  var t = 0.0; let tmax = dist * R * 3.0; let dt = tmax / 220.0;
  var col = mix(vec3<f32>(0.06, 0.07, 0.1), vec3<f32>(0.18, 0.2, 0.28), q.y + 0.5);
  var prevT = 0.0;
  for (var i: i32 = 0; i < 220; i++) {
    let pos = ro + rd * t;
    let p = vec2<f32>(pos.x, pos.z);
    let inside = abs(p.x - U.dom.x) <= U.dom.z && abs(p.y - U.dom.y) <= U.dom.w;
    var d = 1.0;
    if (inside) { d = pos.y - hgt(p); }
    if (inside && d < 0.0) {
      var a = prevT; var b = t;
      for (var k: i32 = 0; k < 6; k++) { let m = 0.5 * (a + b); let pm = ro + rd * m; if (pm.y - hgt(pm.xz) < 0.0) { b = m; } else { a = m; } }
      let ph = ro + rd * b;
      let e = 2.0 * U.dom.z / res.x;
      let n = normalize(vec3<f32>(hgt(ph.xz - vec2<f32>(e, 0.0)) - hgt(ph.xz + vec2<f32>(e, 0.0)), 2.0 * e, hgt(ph.xz - vec2<f32>(0.0, e)) - hgt(ph.xz + vec2<f32>(0.0, e))));
      let base = clamp(eqart(ph.xz), vec3<f32>(0.0), vec3<f32>(1.0));
      let diff = max(dot(n, normalize(vec3<f32>(0.5, 0.9, 0.3))), 0.0);
      col = base * (0.25 + 0.75 * diff);
      break;
    }
    prevT = t; t = t + dt;
    if (t > tmax) { break; }
  }
  return vec4<f32>(col, 1.0);
}
