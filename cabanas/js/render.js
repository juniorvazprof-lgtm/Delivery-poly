// Renderização HD-2D: cena 3D desenhada em baixa resolução e ampliada sem suavizar,
// com contorno seletivo, dithering Bayer e paleta limitada (veio da cena original, sem mudanças no visual).
import * as T from './lib/three.module.js';
import { CFG } from './config.js';

export const PALETA = [
  '#0a0a14', '#141428', '#1e2340', '#2b2f52',
  '#132420', '#1b3a30', '#25553d', '#3f7a48', '#6fa35a', '#a8cf78',
  '#2b1d2a', '#4a2c2a', '#6e4434', '#9a6a44', '#c99a5c',
  '#3a3f5a', '#5d6a8a', '#8c9cb8', '#c5d3e8',
  '#7a3a2a', '#c8703a', '#e8a850', '#f8e6a0', '#fffbe6',
  '#8a2c3a', '#e8b08a',
  '#3fd0c8', '#c84060',                                   // sinalizador de extração (turquesa) e alerta (magenta)
].map(h => new T.Color(h));

export function criarRender(canvas) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.BasicShadowMap;
  const depthTex = new T.DepthTexture(1, 1); depthTex.type = T.UnsignedIntType;
  const rt = new T.WebGLRenderTarget(1, 1, { minFilter: T.NearestFilter, magFilter: T.NearestFilter, depthTexture: depthTex });
  const cam = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 120);
  const post = new T.ShaderMaterial({
    uniforms: { tColor: { value: rt.texture }, tDepth: { value: depthTex }, res: { value: new T.Vector2() },
      pal: { value: PALETA.map(c => { const s = c.clone().convertLinearToSRGB(); return new T.Vector3(s.r, s.g, s.b); }) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: `
      precision highp float;
      uniform sampler2D tColor, tDepth; uniform vec2 res; uniform vec3 pal[${PALETA.length}];
      varying vec2 vUv;
      float bayer(vec2 p){
        int x = int(mod(p.x, 4.)), y = int(mod(p.y, 4.)), i = x + y * 4;
        float m[16]; m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;
        for (int k = 0; k < 16; k++) if (k == i) return m[k] / 16. - .5;
        return 0.;
      }
      vec3 nearest(vec3 c){
        vec3 best = pal[0]; float bd = 1e9;
        for (int i = 0; i < ${PALETA.length}; i++) { vec3 d = c - pal[i]; float e = dot(d * vec3(.9, 1.2, .8), d); if (e < bd) { bd = e; best = pal[i]; } }
        return best;
      }
      void main(){
        vec2 px = 1. / res;
        vec3 c = pow(max(texture2D(tColor, vUv).rgb, 0.), vec3(1. / 2.2));
        float d = texture2D(tDepth, vUv).r;
        float df = max(max(texture2D(tDepth, vUv + vec2(px.x, 0.)).r, texture2D(tDepth, vUv - vec2(px.x, 0.)).r),
                       max(texture2D(tDepth, vUv + vec2(0., px.y)).r, texture2D(tDepth, vUv - vec2(0., px.y)).r));
        if (df - d > .0035 && d < .999) c *= .42;
        vec2 q = vUv - .5; c *= 1. - dot(q, q) * .9;
        c += bayer(gl_FragCoord.xy) * .05;
        gl_FragColor = vec4(nearest(clamp(c, 0., 1.)), 1.);
      }`,
  });
  const postScene = new T.Scene(), postCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  postScene.add(new T.Mesh(new T.PlaneGeometry(2, 2), post));
  let H = 1;
  function resize() {
    H = CFG.pixel.altura; const W = Math.round(H * innerWidth / innerHeight), a = W / H, V = CFG.pixel.view;
    renderer.setSize(W, H, false); rt.setSize(W, H);
    Object.assign(cam, { left: -V * a / 2, right: V * a / 2, top: V / 2, bottom: -V / 2 }); cam.updateProjectionMatrix();
    post.uniforms.res.value.set(W, H);
  }
  addEventListener('resize', resize); resize();

  // câmera isométrica alta (estilo Diablo) que encaixa na grade de pixels para a cena não tremer
  const YAW = Math.PI / 4, PITCH = 0.62, DIST = 30;
  const camDir = new T.Vector3(Math.sin(YAW) * Math.cos(PITCH), Math.sin(PITCH), Math.cos(YAW) * Math.cos(PITCH));
  const focus = new T.Vector3(), camRight = new T.Vector3(), camUp = new T.Vector3();
  let shake = 0;
  return {
    renderer, cam, YAW, focus,
    // eixos da tela no chão: o joystick "para cima" anda para o fundo da tela
    fwd: new T.Vector3(-Math.sin(YAW), 0, -Math.cos(YAW)), right: new T.Vector3(Math.cos(YAW), 0, -Math.sin(YAW)),
    tremer(v) { shake = Math.max(shake, v); },
    /** Projeta um ponto do mundo para a tela (pixels CSS). */
    naTela(p) { const v = p.clone().project(cam); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; },
    seguir(alvo, dt, imediato = false) {
      if (imediato) focus.copy(alvo); else focus.lerp(alvo, 1 - Math.exp(-dt * 6));
      cam.position.copy(focus).addScaledVector(camDir, DIST); cam.lookAt(focus); cam.updateMatrixWorld();
      const texel = CFG.pixel.view / H; camRight.setFromMatrixColumn(cam.matrixWorld, 0); camUp.setFromMatrixColumn(cam.matrixWorld, 1);
      const rx = cam.position.dot(camRight), ry = cam.position.dot(camUp);
      cam.position.addScaledVector(camRight, Math.round(rx / texel) * texel - rx).addScaledVector(camUp, Math.round(ry / texel) * texel - ry);
      if (shake > 0) { shake -= dt; cam.position.addScaledVector(camRight, (Math.random() - .5) * shake).addScaledVector(camUp, (Math.random() - .5) * shake); }
      cam.updateMatrixWorld();
    },
    desenhar(scene) { renderer.setRenderTarget(rt); renderer.render(scene, cam); renderer.setRenderTarget(null); renderer.render(postScene, postCam); },
  };
}
