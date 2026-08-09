import React, { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * 诊断组件：挂在 <Canvas> 内部。
 * 如果渲染管线没有正常出帧，或 WebGL 上下文有问题，就把看到的真实状态
 * 覆盖显示在屏幕上，便于远程定位黑屏原因。
 */
export function WebGLDiagnostic() {
  const { gl, camera, scene } = useThree();
  const [info, setInfo] = useState<string>('Initializing...');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let frames = 0;
    let done = false;

    // 在渲染循环里统计帧数
    const raf = () => {
      if (done) return;
      frames++;
      if (frames >= 30) {
        // ~0.5 秒内出了 30 帧 => 渲染正常
        setInfo('Rendering OK: frames streaming');
        done = true;
        return;
      }
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);

    const timer = setTimeout(() => {
      if (!done && frames === 0) {
        setError(
          '⚠️ No output from render pipeline (0 frames)\n' +
            'WebGL context: ' +
            (gl?.getContext() ? 'created' : 'not created/failed') +
            '\nRenderer: ' +
            (gl ? gl.constructor?.name : 'none') +
            '\nScene objects: ' +
            (scene ? scene.children.length : '?') +
            '\nCamera: ' +
            (camera
              ? `${camera.position.x.toFixed(1)},${camera.position.y.toFixed(1)},${camera.position.z.toFixed(1)}`
              : 'none')
        );
      }
    }, 1500);

    return () => {
      done = true;
      clearTimeout(timer);
    };
  }, [gl, camera, scene]);

  // 捕获渲染内错误
  useEffect(() => {
    const h = (e: any) => setError((p) => p + '\n[render error] ' + (e?.message || e));
    window.addEventListener('error', h);
    return () => window.removeEventListener('error', h);
  }, []);

  if (!error) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.85)',
        color: '#f0f0f0',
        font: '12px/1.5 monospace',
        padding: '20px',
        whiteSpace: 'pre-wrap',
        overflow: 'auto',
      }}
    >
      <b style={{ color: '#ff6b6b' }}>{error}</b>
      <br />
      <br />
      <b>WebGL support check:</b>
      <br />
      {(() => {
        try {
          const c = document.createElement('canvas');
          const gl2 =
            c.getContext('webgl2') || c.getContext('webgl') || (c as any).getContext('experimental-webgl');
          return gl2 ? '✅ WebGL context can be created in browser' : '❌ Browser cannot create WebGL';
        } catch (e) {
          return '❌ WebGL creation error: ' + (e as Error).message;
        }
      })()}
      <br />
      <br />
      three.js version and renderer info (send this if needed):<br />
      THREE r{THREE.REVISION} · WebGLRenderer: {gl ? 'present' : 'absent'}
    </div>
  );
}
