import React, { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Diagnostic overlay mounted inside <Canvas>.
 * If the render pipeline produces no frames or the WebGL context is broken,
 * overlay the real state on screen so black-screen issues are easy to diagnose.
 */
export function WebGLDiagnostic() {
  const { gl, camera, scene } = useThree();
  const [info, setInfo] = useState<string>('Initializing...');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let frames = 0;
    let done = false;

    // Count frames in the render loop
    const raf = () => {
      if (done) return;
      frames++;
      if (frames >= 30) {
        // 30 frames within ~0.5s => rendering is healthy
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

  // Capture in-render errors
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
