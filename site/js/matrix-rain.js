/* ==========================================================================
 * site/js/matrix-rain.js — WebGPU flock-stream with cursor avoidance.
 *
 * Architecture:
 *   - WebGPU compute shader runs boid physics (streaming, avoidance, spring,
 *     damping) entirely on the GPU at 60fps+.
 *   - WebGPU render pipeline draws instanced quads textured from a
 *     pre-rendered glyph atlas.
 *   - Falls back to Canvas 2D (no throttle) when WebGPU is unavailable.
 *
 * Bails out when prefers-reduced-motion: reduce is active.
 * Pauses on document hidden, resumes on visible.
 * ========================================================================== */

(function () {
  'use strict';

  var AVOIDANCE_RADIUS = 120.0;
  var AVOIDANCE_STRENGTH = 8.0;
  var RETURN_STRENGTH = 0.04;
  var DAMPING = 0.88;

  var GLYPHS =
    'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ0123456789Z'.split('');
  var GLYPH_COUNT = GLYPHS.length;

  function getReducedMotionMql() {
    if (typeof window === 'undefined' || !window.matchMedia) return null;
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)');
    } catch (_e) {
      return null;
    }
  }

  // =========================================================================
  // Glyph Atlas — renders all glyphs to a 2D canvas, returns ImageBitmap
  // =========================================================================

  function buildGlyphAtlas(cellSize) {
    var cols = Math.ceil(Math.sqrt(GLYPH_COUNT));
    var rows = Math.ceil(GLYPH_COUNT / cols);
    var atlasW = cols * cellSize;
    var atlasH = rows * cellSize;

    var offscreen = document.createElement('canvas');
    offscreen.width = atlasW;
    offscreen.height = atlasH;
    var ctx = offscreen.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, atlasW, atlasH);
    ctx.font = Math.floor(cellSize * 0.8) + 'px ui-monospace, Menlo, "Liberation Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';

    for (var i = 0; i < GLYPH_COUNT; i++) {
      var col = i % cols;
      var row = Math.floor(i / cols);
      var cx = col * cellSize + cellSize / 2;
      var cy = row * cellSize + cellSize / 2;
      ctx.fillText(GLYPHS[i], cx, cy);
    }

    return { canvas: offscreen, cols: cols, rows: rows, cellSize: cellSize, width: atlasW, height: atlasH };
  }

  // =========================================================================
  // WebGPU Renderer
  // =========================================================================

  async function startWebGPU(canvas) {
    if (!navigator.gpu) return null;

    var adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) return null;
    var device = await adapter.requestDevice();

    var gpuCanvas = canvas;
    var ctx = gpuCanvas.getContext('webgpu');
    if (!ctx) return null;

    var isMobile = window.innerWidth <= 768;
    var fontSize = isMobile ? 13 : 15;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var cellSize = Math.round(fontSize * 1.2);

    var atlas = buildGlyphAtlas(cellSize);
    var atlasCols = atlas.cols;

    var viewW = window.innerWidth;
    var viewH = window.innerHeight;
    gpuCanvas.width = Math.floor(viewW * dpr);
    gpuCanvas.height = Math.floor(viewH * dpr);
    gpuCanvas.style.width = viewW + 'px';
    gpuCanvas.style.height = viewH + 'px';

    var format = navigator.gpu.getPreferredCanvasFormat();
    ctx.configure({ device: device, format: format, alphaMode: 'premultiplied' });

    // Build boid data
    function computeBoidData() {
      viewW = window.innerWidth;
      viewH = window.innerHeight;
      gpuCanvas.width = Math.floor(viewW * dpr);
      gpuCanvas.height = Math.floor(viewH * dpr);
      gpuCanvas.style.width = viewW + 'px';
      gpuCanvas.style.height = viewH + 'px';
      ctx.configure({ device: device, format: format, alphaMode: 'premultiplied' });

      var rowCount = Math.max(6, Math.floor(viewH / (fontSize * 2.4)));
      var boidList = [];

      for (var r = 0; r < rowCount; r++) {
        var depth = (r + 1) / rowCount;
        var rowY = (r + 0.5) * (viewH / rowCount);
        var direction = r % 2 === 0 ? 1.0 : -1.0;
        var baseSpeed = (0.3 + depth * 1.4) * direction;
        var charW = fontSize * (0.7 + depth * 0.3);
        var opacity = 0.06 + depth * 0.18;
        var parallaxFactor = 0.1 + depth * 0.5;
        var scale = 0.6 + depth * 0.4;
        var colCount = Math.ceil(viewW / charW) + 2;
        var totalWidth = colCount * charW;

        for (var c = 0; c < colCount; c++) {
          var homeX = c * charW;
          boidList.push({
            x: homeX, y: rowY,
            vx: 0, vy: 0,
            homeX: homeX, homeY: rowY,
            baseSpeed: baseSpeed,
            charW: charW,
            opacity: opacity,
            depth: depth,
            parallaxFactor: parallaxFactor,
            totalWidth: totalWidth,
            scale: scale,
            glyphIdx: Math.floor(Math.random() * GLYPH_COUNT)
          });
        }
      }
      return boidList;
    }

    var boidList = computeBoidData();
    var numBoids = boidList.length;

    // Boid buffer: each boid = 16 floats
    // [x, y, vx, vy, homeX, homeY, baseSpeed, charW, opacity, parallaxFactor, totalWidth, scale, glyphIdx, _pad, _pad, _pad]
    var BOID_STRIDE = 16;
    var boidData = new Float32Array(numBoids * BOID_STRIDE);
    for (var i = 0; i < numBoids; i++) {
      var b = boidList[i];
      var off = i * BOID_STRIDE;
      boidData[off + 0] = b.x;
      boidData[off + 1] = b.y;
      boidData[off + 2] = b.vx;
      boidData[off + 3] = b.vy;
      boidData[off + 4] = b.homeX;
      boidData[off + 5] = b.homeY;
      boidData[off + 6] = b.baseSpeed;
      boidData[off + 7] = b.charW;
      boidData[off + 8] = b.opacity;
      boidData[off + 9] = b.parallaxFactor;
      boidData[off + 10] = b.totalWidth;
      boidData[off + 11] = b.scale;
      boidData[off + 12] = b.glyphIdx;
      boidData[off + 13] = 0;
      boidData[off + 14] = 0;
      boidData[off + 15] = 0;
    }

    var boidBuffer = device.createBuffer({
      size: boidData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
    });
    new Float32Array(boidBuffer.getMappedRange()).set(boidData);
    boidBuffer.unmap();

    // Uniforms: [mouseX, mouseY, scrollY, viewW, viewH, avoidRadius, avoidStrength, returnStrength, damping, time, _pad, _pad]
    var uniformData = new Float32Array(12);
    var uniformBuffer = device.createBuffer({
      size: uniformData.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    // Glyph atlas texture
    var atlasTexture = device.createTexture({
      size: [atlas.width, atlas.height],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
    });
    device.queue.copyExternalImageToTexture(
      { source: atlas.canvas },
      { texture: atlasTexture },
      [atlas.width, atlas.height]
    );

    var atlasSampler = device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear'
    });

    // --- Compute Pipeline ---
    var computeShader = device.createShaderModule({ code: /* wgsl */`
      struct Boid {
        x: f32, y: f32, vx: f32, vy: f32,
        homeX: f32, homeY: f32, baseSpeed: f32, charW: f32,
        opacity: f32, parallaxFactor: f32, totalWidth: f32, scale: f32,
        glyphIdx: f32, pad0: f32, pad1: f32, pad2: f32,
      };

      struct Uniforms {
        mouseX: f32, mouseY: f32, scrollY: f32, viewW: f32,
        viewH: f32, avoidRadius: f32, avoidStrength: f32, returnStrength: f32,
        damping: f32, time: f32, pad0: f32, pad1: f32,
      };

      @group(0) @binding(0) var<storage, read_write> boids: array<Boid>;
      @group(0) @binding(1) var<uniform> u: Uniforms;

      @compute @workgroup_size(64)
      fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
        let idx = gid.x;
        if (idx >= arrayLength(&boids)) { return; }

        var b = boids[idx];

        // Advance home position
        b.homeX += b.baseSpeed;
        if (b.baseSpeed > 0.0 && b.homeX > b.totalWidth) {
          b.homeX -= b.totalWidth;
        } else if (b.baseSpeed < 0.0 && b.homeX < -b.charW) {
          b.homeX += b.totalWidth;
        }

        // Target with parallax
        let parallaxShift = u.scrollY * b.parallaxFactor * 0.15;
        let targetX = b.homeX + parallaxShift;
        let targetY = b.homeY;

        // Cursor avoidance
        let dx = b.x - u.mouseX;
        let dy = b.y - u.mouseY;
        let dist2 = dx * dx + dy * dy;
        let avoidR2 = u.avoidRadius * u.avoidRadius;

        if (dist2 < avoidR2 && dist2 > 0.1) {
          let dist = sqrt(dist2);
          let force = (u.avoidRadius - dist) / u.avoidRadius;
          let f = force * force * u.avoidStrength;
          b.vx += (dx / dist) * f;
          b.vy += (dy / dist) * f;
        }

        // Spring return
        b.vx += (targetX - b.x) * u.returnStrength;
        b.vy += (targetY - b.y) * u.returnStrength;

        // Damping
        b.vx *= u.damping;
        b.vy *= u.damping;

        // Integrate
        b.x += b.vx;
        b.y += b.vy;

        boids[idx] = b;
      }
    `});

    var computePipeline = device.createComputePipeline({
      layout: 'auto',
      compute: { module: computeShader, entryPoint: 'main' }
    });

    var computeBindGroup = device.createBindGroup({
      layout: computePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: boidBuffer } },
        { binding: 1, resource: { buffer: uniformBuffer } }
      ]
    });

    // --- Render Pipeline ---
    var renderShader = device.createShaderModule({ code: /* wgsl */`
      struct Uniforms {
        mouseX: f32, mouseY: f32, scrollY: f32, viewW: f32,
        viewH: f32, avoidRadius: f32, avoidStrength: f32, returnStrength: f32,
        damping: f32, time: f32, pad0: f32, pad1: f32,
      };

      struct Boid {
        x: f32, y: f32, vx: f32, vy: f32,
        homeX: f32, homeY: f32, baseSpeed: f32, charW: f32,
        opacity: f32, parallaxFactor: f32, totalWidth: f32, scale: f32,
        glyphIdx: f32, pad0: f32, pad1: f32, pad2: f32,
      };

      @group(0) @binding(0) var<uniform> u: Uniforms;
      @group(0) @binding(1) var<storage, read> boids: array<Boid>;
      @group(0) @binding(2) var atlasSampler: sampler;
      @group(0) @binding(3) var atlasTexture: texture_2d<f32>;

      struct VertexOutput {
        @builtin(position) pos: vec4<f32>,
        @location(0) uv: vec2<f32>,
        @location(1) opacity: f32,
      };

      const ATLAS_COLS: f32 = ${atlasCols}.0;
      const ATLAS_ROWS: f32 = ${atlas.rows}.0;
      const CELL_SIZE: f32 = ${cellSize}.0;

      @vertex
      fn vs(@builtin(vertex_index) vid: u32, @builtin(instance_index) iid: u32) -> VertexOutput {
        let b = boids[iid];

        // Wrap x
        var drawX = b.x % b.totalWidth;
        if (drawX < -b.charW) { drawX += b.totalWidth; }

        let size = CELL_SIZE * b.scale;

        // Quad corners (2 triangles, 6 vertices)
        var cornerX: f32; var cornerY: f32;
        var uvX: f32; var uvY: f32;
        switch (vid) {
          case 0u: { cornerX = 0.0; cornerY = 0.0; uvX = 0.0; uvY = 0.0; }
          case 1u: { cornerX = 1.0; cornerY = 0.0; uvX = 1.0; uvY = 0.0; }
          case 2u: { cornerX = 0.0; cornerY = 1.0; uvX = 0.0; uvY = 1.0; }
          case 3u: { cornerX = 1.0; cornerY = 0.0; uvX = 1.0; uvY = 0.0; }
          case 4u: { cornerX = 1.0; cornerY = 1.0; uvX = 1.0; uvY = 1.0; }
          default: { cornerX = 0.0; cornerY = 1.0; uvX = 0.0; uvY = 1.0; }
        }

        let px = drawX + cornerX * size;
        let py = b.y - size * 0.5 + cornerY * size;

        // NDC
        let ndcX = (px / u.viewW) * 2.0 - 1.0;
        let ndcY = 1.0 - (py / u.viewH) * 2.0;

        // Atlas UV
        let gi = u32(b.glyphIdx);
        let atlasCol = f32(gi % u32(ATLAS_COLS));
        let atlasRow = f32(gi / u32(ATLAS_COLS));
        let atlasU = (atlasCol + uvX) / ATLAS_COLS;
        let atlasV = (atlasRow + uvY) / ATLAS_ROWS;

        var out: VertexOutput;
        out.pos = vec4<f32>(ndcX, ndcY, 0.0, 1.0);
        out.uv = vec2<f32>(atlasU, atlasV);
        out.opacity = b.opacity;
        return out;
      }

      @fragment
      fn fs(in: VertexOutput) -> @location(0) vec4<f32> {
        let texColor = textureSample(atlasTexture, atlasSampler, in.uv);
        let alpha = texColor.r * in.opacity;
        return vec4<f32>(0.706, 0.667, 0.608, alpha);
      }
    `});

    var renderPipeline = device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: renderShader, entryPoint: 'vs' },
      fragment: {
        module: renderShader,
        entryPoint: 'fs',
        targets: [{
          format: format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
          }
        }]
      },
      primitive: { topology: 'triangle-list' }
    });

    var renderBindGroup = device.createBindGroup({
      layout: renderPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: uniformBuffer } },
        { binding: 1, resource: { buffer: boidBuffer } },
        { binding: 2, resource: atlasSampler },
        { binding: 3, resource: atlasTexture.createView() }
      ]
    });

    // Animation state
    var scrollY = 0;
    var mouseX = -9999.0;
    var mouseY = -9999.0;
    var paused = false;
    var rafId = 0;
    var time = 0;
    var workgroupCount = Math.ceil(numBoids / 64);

    function frame() {
      rafId = requestAnimationFrame(frame);
      if (paused) return;

      time += 1.0;

      // Update uniforms
      uniformData[0] = mouseX;
      uniformData[1] = mouseY;
      uniformData[2] = scrollY;
      uniformData[3] = viewW;
      uniformData[4] = viewH;
      uniformData[5] = AVOIDANCE_RADIUS;
      uniformData[6] = AVOIDANCE_STRENGTH;
      uniformData[7] = RETURN_STRENGTH;
      uniformData[8] = DAMPING;
      uniformData[9] = time;
      device.queue.writeBuffer(uniformBuffer, 0, uniformData);

      var encoder = device.createCommandEncoder();

      // Compute pass
      var computePass = encoder.beginComputePass();
      computePass.setPipeline(computePipeline);
      computePass.setBindGroup(0, computeBindGroup);
      computePass.dispatchWorkgroups(workgroupCount);
      computePass.end();

      // Render pass
      var textureView = ctx.getCurrentTexture().createView();
      var renderPass = encoder.beginRenderPass({
        colorAttachments: [{
          view: textureView,
          clearValue: { r: 0.051, g: 0.051, b: 0.051, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store'
        }]
      });
      renderPass.setPipeline(renderPipeline);
      renderPass.setBindGroup(0, renderBindGroup);
      renderPass.draw(6, numBoids);
      renderPass.end();

      device.queue.submit([encoder.finish()]);
    }

    rafId = requestAnimationFrame(frame);

    function onResize() {
      // Full rebuild on resize
      boidList = computeBoidData();
      numBoids = boidList.length;
      workgroupCount = Math.ceil(numBoids / 64);

      var newBoidData = new Float32Array(numBoids * BOID_STRIDE);
      for (var i = 0; i < numBoids; i++) {
        var bd = boidList[i];
        var off = i * BOID_STRIDE;
        newBoidData[off + 0] = bd.x;
        newBoidData[off + 1] = bd.y;
        newBoidData[off + 2] = bd.vx;
        newBoidData[off + 3] = bd.vy;
        newBoidData[off + 4] = bd.homeX;
        newBoidData[off + 5] = bd.homeY;
        newBoidData[off + 6] = bd.baseSpeed;
        newBoidData[off + 7] = bd.charW;
        newBoidData[off + 8] = bd.opacity;
        newBoidData[off + 9] = bd.parallaxFactor;
        newBoidData[off + 10] = bd.totalWidth;
        newBoidData[off + 11] = bd.scale;
        newBoidData[off + 12] = bd.glyphIdx;
      }

      boidBuffer.destroy();
      boidBuffer = device.createBuffer({
        size: newBoidData.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true
      });
      new Float32Array(boidBuffer.getMappedRange()).set(newBoidData);
      boidBuffer.unmap();

      computeBindGroup = device.createBindGroup({
        layout: computePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: boidBuffer } },
          { binding: 1, resource: { buffer: uniformBuffer } }
        ]
      });
      renderBindGroup = device.createBindGroup({
        layout: renderPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: uniformBuffer } },
          { binding: 1, resource: { buffer: boidBuffer } },
          { binding: 2, resource: atlasSampler },
          { binding: 3, resource: atlasTexture.createView() }
        ]
      });
    }

    function onScroll() {
      scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    }
    function onMouseMove(e) { mouseX = e.clientX; mouseY = e.clientY; }
    function onMouseLeave() { mouseX = -9999; mouseY = -9999; }
    function onVisibilityChange() { paused = document.visibilityState === 'hidden'; }

    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave, false);
    document.addEventListener('visibilitychange', onVisibilityChange, false);
    onScroll();

    return {
      stop: function () {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
        window.removeEventListener('resize', onResize);
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseleave', onMouseLeave);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        boidBuffer.destroy();
        uniformBuffer.destroy();
        atlasTexture.destroy();
        device.destroy();
      }
    };
  }

  // =========================================================================
  // Canvas 2D Fallback (no throttle — runs at native rAF ~60fps)
  // =========================================================================

  function startCanvas2D(canvas) {
    var ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return null;

    var isMobile = window.innerWidth <= 768;
    var fontSize = isMobile ? 13 : 15;
    var dpr = isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 2);

    var boids = [];
    var viewW = 0;
    var viewH = 0;
    var scrollY = 0;
    var mouseX = -9999;
    var mouseY = -9999;

    function buildBoids() {
      viewW = window.innerWidth;
      viewH = window.innerHeight;
      canvas.width = Math.floor(viewW * dpr);
      canvas.height = Math.floor(viewH * dpr);
      canvas.style.width = viewW + 'px';
      canvas.style.height = viewH + 'px';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      var rowCount = Math.max(6, Math.floor(viewH / (fontSize * 2.4)));
      var newBoids = [];
      for (var r = 0; r < rowCount; r++) {
        var depth = (r + 1) / rowCount;
        var rowY = (r + 0.5) * (viewH / rowCount);
        var direction = r % 2 === 0 ? 1 : -1;
        var baseSpeed = (0.3 + depth * 1.4) * direction;
        var charW = fontSize * (0.7 + depth * 0.3);
        var opacity = 0.06 + depth * 0.18;
        var parallaxFactor = 0.1 + depth * 0.5;
        var colCount = Math.ceil(viewW / charW) + 2;
        var totalWidth = colCount * charW;
        for (var c = 0; c < colCount; c++) {
          newBoids.push({
            homeX: c * charW, homeY: rowY,
            x: c * charW, y: rowY,
            vx: 0, vy: 0,
            baseSpeed: baseSpeed, charW: charW,
            fontSize: Math.round(fontSize * (0.6 + depth * 0.4)),
            opacity: opacity, parallaxFactor: parallaxFactor,
            totalWidth: totalWidth,
            glyph: GLYPHS[Math.floor(Math.random() * GLYPH_COUNT)],
            glyphTimer: Math.floor(Math.random() * 300)
          });
        }
      }
      boids = newBoids;
    }

    buildBoids();

    var rafId = 0;
    var paused = false;
    var avoidR2 = AVOIDANCE_RADIUS * AVOIDANCE_RADIUS;

    function step() {
      rafId = requestAnimationFrame(step);
      if (paused) return;

      ctx.fillStyle = 'rgba(13, 13, 13, 0.92)';
      ctx.fillRect(0, 0, viewW, viewH);

      for (var i = 0; i < boids.length; i++) {
        var b = boids[i];
        b.homeX += b.baseSpeed;
        if (b.baseSpeed > 0 && b.homeX > b.totalWidth) b.homeX -= b.totalWidth;
        else if (b.baseSpeed < 0 && b.homeX < -b.charW) b.homeX += b.totalWidth;

        var targetX = b.homeX + scrollY * b.parallaxFactor * 0.15;
        var dx = b.x - mouseX;
        var dy = b.y - mouseY;
        var dist2 = dx * dx + dy * dy;
        if (dist2 < avoidR2 && dist2 > 0.1) {
          var dist = Math.sqrt(dist2);
          var force = (AVOIDANCE_RADIUS - dist) / AVOIDANCE_RADIUS;
          force = force * force * AVOIDANCE_STRENGTH;
          b.vx += (dx / dist) * force;
          b.vy += (dy / dist) * force;
        }
        b.vx += (targetX - b.x) * RETURN_STRENGTH;
        b.vy += (b.homeY - b.y) * RETURN_STRENGTH;
        b.vx *= DAMPING;
        b.vy *= DAMPING;
        b.x += b.vx;
        b.y += b.vy;

        var drawX = b.x % b.totalWidth;
        if (drawX < -b.charW) drawX += b.totalWidth;
        if (drawX > viewW + b.charW || drawX < -b.charW) continue;

        b.glyphTimer--;
        if (b.glyphTimer <= 0) {
          b.glyph = GLYPHS[Math.floor(Math.random() * GLYPH_COUNT)];
          b.glyphTimer = 200 + Math.floor(Math.random() * 400);
        }

        ctx.font = b.fontSize + 'px ui-monospace, Menlo, "Liberation Mono", monospace';
        ctx.fillStyle = 'rgba(180, 170, 155, ' + b.opacity + ')';
        ctx.fillText(b.glyph, drawX, b.y);
      }
    }

    rafId = requestAnimationFrame(step);

    function onResize() { buildBoids(); }
    function onScroll() { scrollY = window.pageYOffset || document.documentElement.scrollTop || 0; }
    function onMouseMove(e) { mouseX = e.clientX; mouseY = e.clientY; }
    function onMouseLeave() { mouseX = -9999; mouseY = -9999; }
    function onVisibilityChange() { paused = document.visibilityState === 'hidden'; }

    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave, false);
    document.addEventListener('visibilitychange', onVisibilityChange, false);
    onScroll();

    return {
      stop: function () {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
        window.removeEventListener('resize', onResize);
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseleave', onMouseLeave);
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
    };
  }

  // =========================================================================
  // Init — try WebGPU first, fall back to Canvas 2D
  // =========================================================================

  function init() {
    var canvas = document.querySelector('canvas.matrix-rain-canvas');
    if (!canvas) return;

    var mql = getReducedMotionMql();
    var running = null;

    async function arm() {
      if (mql && mql.matches) {
        if (running) { running.stop(); running = null; }
        return;
      }
      if (running) return;

      running = await startWebGPU(canvas);
      if (!running) {
        running = startCanvas2D(canvas);
      }
    }

    arm();

    if (mql && typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', function () { arm(); });
    } else if (mql && typeof mql.addListener === 'function') {
      mql.addListener(function () { arm(); });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
