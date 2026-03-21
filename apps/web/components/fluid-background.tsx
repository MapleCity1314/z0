"use client";

import { useEffect, useRef } from "react";

const fragmentShaderSource = `
#ifdef GL_ES
precision highp float;
#endif

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_is_dark;
uniform float u_intro_progress; // 新增：控制开场动画进度 (0.0 到 1.0)

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.y;
  uv.x -= (u_resolution.x / u_resolution.y) * 0.5;
  uv.y -= 0.5;
  
  // 基础缩放
  uv *= 2.5;
  // 新增：轻微的缩放动画（画面伴随圆圈展开，从 1.5倍 缩放到 1.0倍 正常大小）
  uv *= mix(1.5, 1.0, u_intro_progress);

  float t = u_time * 0.1;
  vec2 p = uv;

  for (float i = 1.0; i <= 3.0; i++) {
    p.x += 0.6 / i * sin(i * 2.0 * p.y + t);
    p.y += 0.6 / i * cos(i * 2.0 * p.x - t);
  }

  float v = sin(p.x + p.y + t);
  v = v * 0.5 + 0.5;

  float brightness = pow(v, 12.0);
  float grain = random(gl_FragCoord.xy * 0.5 + t);
  float frosted = brightness + (brightness * (grain - 0.5) * 0.5);

  vec3 darkCol = vec3(clamp(frosted, 0.0, 0.7));
  vec3 lightCol = vec3(clamp(1.0 - (frosted * 0.85), 0.15, 1.0));
  vec3 col = mix(lightCol, darkCol, u_is_dark);

  // 原有的暗角（Vignette）效果
  float dist = length(gl_FragCoord.xy / u_resolution.xy - 0.5);
  col *= smoothstep(0.8, 0.0, dist * 1.0);

  // ==========================================
  // 新增：开场遮罩（从中心向外扩展的柔和圆形）
  // ==========================================
  // 计算基于屏幕比例校正的中心距离，确保遮罩是个正圆
  vec2 aspect_uv = gl_FragCoord.xy / u_resolution.xy - 0.5;
  aspect_uv.x *= u_resolution.x / u_resolution.y;
  float aspect_dist = length(aspect_uv);
  
  // 展开的最大半径设为 2.5，足够覆盖所有极宽比例屏幕的四个角
  float current_radius = u_intro_progress * 2.5;
  // 使用 smoothstep 制作圆的柔和边缘（0.5为边缘羽化宽度）
  float intro_mask = 1.0 - smoothstep(current_radius - 0.5, current_radius, aspect_dist);
  
  // 应用遮罩
  col *= intro_mask;

  gl_FragColor = vec4(col, 1.0);
}
`;

const vertexShaderSource = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

type FluidBackgroundProps = {
  isDark: boolean;
};

export default function FluidBackground({ isDark }: FluidBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDarkRef = useRef(isDark);
  const glStateRef = useRef<{
    gl: WebGLRenderingContext;
    program: WebGLProgram;
    vertexShader: WebGLShader;
    fragmentShader: WebGLShader;
    positionBuffer: WebGLBuffer | null;
    timeLoc: WebGLUniformLocation | null;
    resLoc: WebGLUniformLocation | null;
    isDarkLoc: WebGLUniformLocation | null;
    introLoc: WebGLUniformLocation | null; // 新增状态
    startTime: number;
    rafId: number;
    lastWidth: number;
    lastHeight: number;
  } | null>(null);

  useEffect(() => {
    isDarkRef.current = isDark;
    const state = glStateRef.current;
    if (!state || !state.isDarkLoc) return;

    state.gl.useProgram(state.program);
    state.gl.uniform1f(state.isDarkLoc, isDark ? 1.0 : 0.0);
  },[isDark]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) return;

    const compileShader = (source: string, type: number) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return;
    }

    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1.0, -1.0, 1.0, -1.0, -1.0, 1.0,
        -1.0, 1.0, 1.0, -1.0, 1.0, 1.0,
      ]),
      gl.STATIC_DRAW
    );

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const timeLoc = gl.getUniformLocation(program, "u_time");
    const resLoc = gl.getUniformLocation(program, "u_resolution");
    const isDarkLoc = gl.getUniformLocation(program, "u_is_dark");
    const introLoc = gl.getUniformLocation(program, "u_intro_progress"); // 获取新增的 Uniform 地址

    const state = {
      gl,
      program,
      vertexShader,
      fragmentShader,
      positionBuffer,
      timeLoc,
      resLoc,
      isDarkLoc,
      introLoc, // 保存到 ref
      startTime: Date.now(),
      rafId: 0,
      lastWidth: 0,
      lastHeight: 0,
    };
    glStateRef.current = state;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const nextWidth = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const nextHeight = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (nextWidth === state.lastWidth && nextHeight === state.lastHeight) return;

      state.lastWidth = nextWidth;
      state.lastHeight = nextHeight;
      canvas.width = nextWidth;
      canvas.height = nextHeight;
      gl.viewport(0, 0, nextWidth, nextHeight);
      if (state.resLoc) gl.uniform2f(state.resLoc, nextWidth, nextHeight);
    };

    const render = () => {
      resize();
      
      // 时间相关的计算
      const time = (Date.now() - state.startTime) * 0.001;
      
      // ==========================================
      // 开场动画逻辑 (持续时间: 2.0 秒)
      // ==========================================
      const introDuration = 2.0; 
      // 限制进度在 0.0 到 1.0 之间
      const rawProgress = Math.min(1.0, time / introDuration);
      // 使用 easeOutQuart 缓动曲线，让展开速度“先快后慢”，表现更丝滑
      const easedIntro = 1.0 - Math.pow(1.0 - rawProgress, 4);

      if (state.timeLoc) gl.uniform1f(state.timeLoc, time);
      if (state.isDarkLoc) gl.uniform1f(state.isDarkLoc, isDarkRef.current ? 1.0 : 0.0);
      if (state.introLoc) gl.uniform1f(state.introLoc, easedIntro); // 传入动画进度

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      state.rafId = requestAnimationFrame(render);
    };

    const startLoop = () => {
      if (state.rafId !== 0) return;
      state.rafId = requestAnimationFrame(render);
    };

    const stopLoop = () => {
      if (state.rafId === 0) return;
      cancelAnimationFrame(state.rafId);
      state.rafId = 0;
    };

    const onVisibilityChange = () => {
      if (document.hidden) stopLoop();
      else startLoop();
    };

    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(canvas);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibilityChange);

    if (isDarkLoc) gl.uniform1f(isDarkLoc, isDarkRef.current ? 1.0 : 0.0);
    resize();
    startLoop();

    return () => {
      stopLoop();
      resizeObserver.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      if (positionBuffer) gl.deleteBuffer(positionBuffer);
      glStateRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 block h-full w-full select-none"
      aria-hidden="true"
    />
  );
}
