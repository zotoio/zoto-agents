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
  var v0: f32 = p.x;
  var v1: f32 = p.y;
  var v2: f32 = 0.0;
  for (var i3: i32 = 0; i3 < 14; i3++) {
    var v4: f32 = mix(mix(mix(v0, (((-2.20588 * v0) + (2.57353 * v1)) + -1.13235), step(0.5, (((step(-2.1757, (((-2.20588 * v0) + (2.57353 * v1)) + -1.13235)) * step((((-2.20588 * v0) + (2.57353 * v1)) + -1.13235), 2.63262)) * step(0.0968283, (((2.38971 * v0) + (1.37868 * v1)) + -0.606618))) * step((((2.38971 * v0) + (1.37868 * v1)) + -0.606618), 9.98638)))), (((2.11946 * v0) + (2.50482 * v1)) + -4.00771), step(0.5, (((step(-2.1757, (((2.11946 * v0) + (2.50482 * v1)) + -4.00771)) * step((((2.11946 * v0) + (2.50482 * v1)) + -4.00771), 2.63262)) * step(0.0968283, (((-2.2158 * v0) + (1.92678 * v1)) + -3.08285))) * step((((-2.2158 * v0) + (1.92678 * v1)) + -3.08285), 9.98638)))), (((1.17387 * v0) + (-0.055241 * v1)) + 0.0883856), step(0.5, (((step(-2.1757, (((1.17387 * v0) + (-0.055241 * v1)) + 0.0883856)) * step((((1.17387 * v0) + (-0.055241 * v1)) + 0.0883856), 2.63262)) * step(0.0968283, (((0.055241 * v0) + (1.17387 * v1)) + -1.87819))) * step((((0.055241 * v0) + (1.17387 * v1)) + -1.87819), 9.98638))));
    var v5: f32 = mix(mix(mix(v1, (((2.38971 * v0) + (1.37868 * v1)) + -0.606618), step(0.5, (((step(-2.1757, (((-2.20588 * v0) + (2.57353 * v1)) + -1.13235)) * step((((-2.20588 * v0) + (2.57353 * v1)) + -1.13235), 2.63262)) * step(0.0968283, (((2.38971 * v0) + (1.37868 * v1)) + -0.606618))) * step((((2.38971 * v0) + (1.37868 * v1)) + -0.606618), 9.98638)))), (((-2.2158 * v0) + (1.92678 * v1)) + -3.08285), step(0.5, (((step(-2.1757, (((2.11946 * v0) + (2.50482 * v1)) + -4.00771)) * step((((2.11946 * v0) + (2.50482 * v1)) + -4.00771), 2.63262)) * step(0.0968283, (((-2.2158 * v0) + (1.92678 * v1)) + -3.08285))) * step((((-2.2158 * v0) + (1.92678 * v1)) + -3.08285), 9.98638)))), (((0.055241 * v0) + (1.17387 * v1)) + -1.87819), step(0.5, (((step(-2.1757, (((1.17387 * v0) + (-0.055241 * v1)) + 0.0883856)) * step((((1.17387 * v0) + (-0.055241 * v1)) + 0.0883856), 2.63262)) * step(0.0968283, (((0.055241 * v0) + (1.17387 * v1)) + -1.87819))) * step((((0.055241 * v0) + (1.17387 * v1)) + -1.87819), 9.98638))));
    v0 = v4;
    v1 = v5;
    v2 = v2 + 1.0;
    if ((1.0 - max(max((((step(-2.1757, (((1.17387 * v0) + (-0.055241 * v1)) + 0.0883856)) * step((((1.17387 * v0) + (-0.055241 * v1)) + 0.0883856), 2.63262)) * step(0.0968283, (((0.055241 * v0) + (1.17387 * v1)) + -1.87819))) * step((((0.055241 * v0) + (1.17387 * v1)) + -1.87819), 9.98638)), (((step(-2.1757, (((2.11946 * v0) + (2.50482 * v1)) + -4.00771)) * step((((2.11946 * v0) + (2.50482 * v1)) + -4.00771), 2.63262)) * step(0.0968283, (((-2.2158 * v0) + (1.92678 * v1)) + -3.08285))) * step((((-2.2158 * v0) + (1.92678 * v1)) + -3.08285), 9.98638))), (((step(-2.1757, (((-2.20588 * v0) + (2.57353 * v1)) + -1.13235)) * step((((-2.20588 * v0) + (2.57353 * v1)) + -1.13235), 2.63262)) * step(0.0968283, (((2.38971 * v0) + (1.37868 * v1)) + -0.606618))) * step((((2.38971 * v0) + (1.37868 * v1)) + -0.606618), 9.98638)))) > 0.5) { break; }
  }
  var v6: f32 = (step(14.0, v2) * (((step(-2.1757, v0) * step(v0, 2.63262)) * step(0.0968283, v1)) * step(v1, 9.98638)));
  return ((vec3<f32>(0.184, 0.561, 0.227) * vec3<f32>(v6)) + (vec3<f32>(1.0, 1.0, 1.0) * vec3<f32>((1.0 - v6))));
}

fn luma(c: vec3<f32>) -> f32 { return dot(clamp(c, vec3<f32>(0.0), vec3<f32>(1.0)), vec3<f32>(0.299, 0.587, 0.114)); }
fn hgt(p: vec2<f32>) -> f32 {
  return 0.9723365195923277 * (1.0 - luma(eqart(p)));
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
