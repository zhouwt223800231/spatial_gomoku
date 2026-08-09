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
  const [info, setInfo] = useState<string>('初始化中…');
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
        setInfo('渲染正常: 正在出帧');
        done = true;
        return;
      }
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);

    const timer = setTimeout(() => {
      if (!done && frames === 0) {
        setError(
          '⚠️ 渲染管线无输出（0 帧）\n' +
            'WebGL context: ' +
            (gl?.getContext() ? '已创建' : '未创建/失败') +
            '\nRenderer: ' +
            (gl ? gl.constructor?.name : '无') +
            '\n场景物体数: ' +
            (scene ? scene.children.length : '?') +
            '\n相机: ' +
            (camera
              ? `${camera.position.x.toFixed(1)},${camera.position.y.toFixed(1)},${camera.position.z.toFixed(1)}`
              : '无')
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
    const h = (e: any) => setError((p) => p + '\n[渲染错误] ' + (e?.message || e));
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
      <b>WebGL 版本支持检测:</b>
      <br />
      {(() => {
        try {
          const c = document.createElement('canvas');
          const gl2 =
            c.getContext('webgl2') || c.getContext('webgl') || (c as any).getContext('experimental-webgl');
          return gl2 ? '✅ WebGL context 可在浏览器创建' : '❌ 浏览器无法创建 WebGL';
        } catch (e) {
          return '❌ 创建 WebGL 异常: ' + (e as Error).message;
        }
      })()}
      <br />
      <br />
      以下是 three.js 的版本与渲染器信息（如需要可发给我）：<br />
      THREE r{THREE.REVISION} · WebGLRenderer: {gl ? '存在' : '不存在'}
    </div>
  );
}
