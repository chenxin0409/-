
import * as THREE from 'three';

export function createParticleTexture(type: 'shard' | 'glow' | 'spark' | 'petal' | 'meteor'): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  if (!ctx) return new THREE.Texture();

  if (type === 'shard') {
    // Sharp diamond/spark shape for core density
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(32, 2);
    ctx.lineTo(40, 24);
    ctx.lineTo(62, 32);
    ctx.lineTo(40, 40);
    ctx.lineTo(32, 62);
    ctx.lineTo(24, 40);
    ctx.lineTo(2, 32);
    ctx.lineTo(24, 24);
    ctx.closePath();
    ctx.fill();
    
    // Inner glow
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 20);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fill();
  } else if (type === 'glow') {
    // Soft glow
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.2)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  } else if (type === 'spark') {
    // Star shape
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(32, 32, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.fillRect(28, 0, 8, 64);
    ctx.fillRect(0, 28, 64, 8);
  } else if (type === 'petal') {
    // Organic Rose Petal shape
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(32, 60);
    // Asymmetric curves for natural look
    ctx.bezierCurveTo(10, 50, 0, 20, 25, 10);
    ctx.bezierCurveTo(40, 5, 50, 15, 32, 25); // Fold
    ctx.bezierCurveTo(45, 10, 64, 15, 55, 35);
    ctx.bezierCurveTo(50, 50, 40, 55, 32, 60);
    ctx.fill();
    
    // Soft gradient for depth
    const g = ctx.createLinearGradient(10, 10, 50, 50);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0.5)');
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = g;
    ctx.fill();
  } else if (type === 'meteor') {
    // Long trail texture
    // Gradient from Top-Right (Head) to Bottom-Left (Tail)
    const g = ctx.createLinearGradient(60, 4, 4, 60);
    g.addColorStop(0, 'rgba(255,255,255,1)');    // Bright head
    g.addColorStop(0.1, 'rgba(255,255,255,0.9)'); 
    g.addColorStop(1, 'rgba(255,255,255,0)');    // Transparent tail
    
    ctx.fillStyle = g;
    ctx.beginPath();
    // Very thin, long tapered shape
    ctx.moveTo(60, 4);   // Head tip
    ctx.quadraticCurveTo(64, 0, 56, 12); // Right shoulder
    ctx.lineTo(4, 60);   // Tail tip
    ctx.lineTo(12, 56);  // Left shoulder
    ctx.lineTo(60, 4);   // Back to head
    ctx.fill();
    
    // Bright Core (Head)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(58, 6, 4, 0, Math.PI * 2); // Slightly larger core
    ctx.fill();
    
    // Add outer glow to head
    const glow = ctx.createRadialGradient(58, 6, 0, 58, 6, 15);
    glow.addColorStop(0, 'rgba(255,255,255,0.8)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}
