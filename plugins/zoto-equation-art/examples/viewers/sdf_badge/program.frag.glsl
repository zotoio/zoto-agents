#version 300 es
precision highp float;
uniform vec4 uA; // width, height, mode (0=2D, 1=3D), hscale
uniform vec4 uB; // yaw, pitch, dist, has_sdf
uniform vec4 U_DOM; // cx, cy, half-width, half-height
uniform sampler2D uTex;
out vec4 outColor;
#define U_W uA.x
#define U_H uA.y
#define U_PX gl_FragCoord.x
#define U_PY (uA.y - gl_FragCoord.y)
vec3 eqart(vec2 p) {
  float v0 = (p.x - 0.25);
  float v1 = p.y;
  float v2 = 0.35;
  float v3 = (length(vec2(v0, v1)) - v2);
  float v4 = (p.x + 0.25);
  float v5 = p.y;
  float v6 = 0.25;
  float v7 = 0.25;
  float v8 = (abs(v4) - v6);
  float v9 = (abs(v5) - v7);
  float v10 = (length(vec2(max(v8, 0.0), max(v9, 0.0))) + min(max(v8, v9), 0.0));
  float v11 = 0.15;
  float v12 = clamp((0.5 + ((0.5 * (v10 - v3)) / v11)), 0.0, 1.0);
  float v13 = ((v10 + (v3 - v10) * v12) - ((v11 * v12) * (1.0 - v12)));
  float v14 = p.x;
  float v15 = p.y;
  float v16 = 0.85;
  float v17 = exp(-exp(clamp(300.0 * (abs((length(vec2(v14, v15)) - v16)) - 0.04), -60.0, 60.0)));
  float v18 = exp(-exp(clamp(200.0 * v13, -60.0, 60.0)));
  return ((((vec3(0.08, 0.09, 0.12) * vec3((1.0 - v18))) * vec3((1.0 - v17))) + (vec3(0.95, 0.55, 0.2) * vec3(v18))) + ((vec3(0.3, 0.7, 0.9) * vec3(v17)) * vec3((1.0 - v18))));
}

float luma(vec3 c) { return dot(clamp(c, 0.0, 1.0), vec3(0.299, 0.587, 0.114)); }
float hgt(vec2 p) {
  return 0.18 * luma(eqart(p));
}
void main() {
  vec2 frag = gl_FragCoord.xy / uA.xy;
  if (uA.z < 0.5) {
    vec2 p = vec2(U_DOM.x + (frag.x - 0.5) * 2.0 * U_DOM.z, U_DOM.y + (frag.y - 0.5) * 2.0 * U_DOM.w);
    outColor = vec4(clamp(eqart(p), 0.0, 1.0), 1.0);
    return;
  }
  float yaw = uB.x, pitch = uB.y, dist = uB.z;
  float R = max(U_DOM.z, U_DOM.w);
  vec3 tgt = vec3(U_DOM.x, 0.0, U_DOM.y);
  vec3 ro = tgt + dist * R * vec3(cos(pitch) * sin(yaw), sin(pitch), cos(pitch) * cos(yaw));
  vec3 fw = normalize(tgt - ro), rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0))), up = cross(rt, fw);
  vec2 q = (gl_FragCoord.xy - 0.5 * uA.xy) / uA.y;
  vec3 rd = normalize(fw * 1.6 + rt * q.x + up * q.y);
  float t = 0.0, tmax = dist * R * 3.0, dt = tmax / 220.0;
  vec3 col = mix(vec3(0.06, 0.07, 0.1), vec3(0.18, 0.2, 0.28), q.y + 0.5);
  float prevD = 1.0, prevT = 0.0;
  for (int i = 0; i < 220; i++) {
    vec3 pos = ro + rd * t;
    vec2 p = vec2(pos.x, pos.z);
    bool inside = abs(p.x - U_DOM.x) <= U_DOM.z && abs(p.y - U_DOM.y) <= U_DOM.w;
    float d = inside ? pos.y - hgt(p) : 1.0;
    if (inside && d < 0.0) {
      float a = prevT, b = t;
      for (int k = 0; k < 6; k++) { float m = 0.5 * (a + b); vec3 pm = ro + rd * m; if (pm.y - hgt(pm.xz) < 0.0) b = m; else a = m; }
      vec3 ph = ro + rd * b;
      float e = 2.0 * U_DOM.z / uA.x;
      vec3 n = normalize(vec3(hgt(ph.xz - vec2(e, 0.0)) - hgt(ph.xz + vec2(e, 0.0)), 2.0 * e, hgt(ph.xz - vec2(0.0, e)) - hgt(ph.xz + vec2(0.0, e))));
      vec3 base = clamp(eqart(vec2(ph.x, ph.z)), 0.0, 1.0);
      float diff = max(dot(n, normalize(vec3(0.5, 0.9, 0.3))), 0.0);
      col = base * (0.25 + 0.75 * diff);
      break;
    }
    prevT = t; t += dt;
    if (t > tmax) break;
  }
  outColor = vec4(col, 1.0);
}
