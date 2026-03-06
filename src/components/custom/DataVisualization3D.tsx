import { useEffect, useRef } from 'react';

interface Node {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  status: 'active' | 'idle' | 'processing';
  size: number;
  pulsePhase: number;
}

export function DataVisualization3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const nodesRef = useRef<Node[]>([]);
  const rotationRef = useRef({ x: 0.3, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize nodes
    const nodeCount = 18;
    nodesRef.current = Array.from({ length: nodeCount }, () => ({
      x: (Math.random() - 0.5) * 200,
      y: (Math.random() - 0.5) * 300,
      z: (Math.random() - 0.5) * 100,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      vz: (Math.random() - 0.5) * 0.2,
      status: Math.random() > 0.6 ? 'active' : Math.random() > 0.3 ? 'processing' : 'idle',
      size: 4 + Math.random() * 6,
      pulsePhase: Math.random() * Math.PI * 2,
    }));

    const project3D = (x: number, y: number, z: number) => {
      const rotX = rotationRef.current.x;
      const rotY = rotationRef.current.y;

      // Rotate around Y axis
      let x1 = x * Math.cos(rotY) - z * Math.sin(rotY);
      let z1 = x * Math.sin(rotY) + z * Math.cos(rotY);

      // Rotate around X axis
      let y2 = y * Math.cos(rotX) - z1 * Math.sin(rotX);
      let z2 = y * Math.sin(rotX) + z1 * Math.cos(rotX);

      // Perspective projection
      const fov = 400;
      const scale = fov / (fov + z2 + 300);

      const rect = canvas.parentElement?.getBoundingClientRect();
      const centerX = (rect?.width || 400) / 2;
      const centerY = (rect?.height || 500) / 2;

      return {
        x: centerX + x1 * scale,
        y: centerY + y2 * scale,
        scale,
        z: z2,
      };
    };

    let frameCount = 0;
    const animate = () => {
      frameCount++;
      
      // Render every 2nd frame for performance (30fps)
      if (frameCount % 2 === 0) {
        const rect = canvas.parentElement?.getBoundingClientRect();
        if (!rect) return;

        ctx.clearRect(0, 0, rect.width, rect.height);

        // Update rotation
        rotationRef.current.y += 0.003;

        // Update nodes
        nodesRef.current.forEach((node) => {
          node.x += node.vx;
          node.y += node.vy;
          node.z += node.vz;
          node.pulsePhase += 0.05;

          // Boundary check
          if (Math.abs(node.x) > 120) node.vx *= -1;
          if (Math.abs(node.y) > 180) node.vy *= -1;
          if (Math.abs(node.z) > 60) node.vz *= -1;
        });

        // Draw connections
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.1)';
        ctx.lineWidth = 1;

        nodesRef.current.forEach((node, i) => {
          nodesRef.current.slice(i + 1).forEach((other) => {
            const dist = Math.sqrt(
              Math.pow(node.x - other.x, 2) +
              Math.pow(node.y - other.y, 2) +
              Math.pow(node.z - other.z, 2)
            );

            if (dist < 100) {
              const p1 = project3D(node.x, node.y, node.z);
              const p2 = project3D(other.x, other.y, other.z);

              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.globalAlpha = (1 - dist / 100) * 0.3 * Math.min(p1.scale, p2.scale);
              ctx.stroke();
            }
          });
        });

        ctx.globalAlpha = 1;

        // Draw nodes
        nodesRef.current
          .sort((a, b) => b.z - a.z)
          .forEach((node) => {
            const p = project3D(node.x, node.y, node.z);
            const pulseScale = 1 + Math.sin(node.pulsePhase) * 0.15;

            let color = '#ff0000';
            let glowColor = 'rgba(255, 0, 0, 0.5)';
            let alpha = 0.8;

            if (node.status === 'idle') {
              color = '#666';
              glowColor = 'rgba(100, 100, 100, 0.3)';
              alpha = 0.4;
            } else if (node.status === 'processing') {
              color = '#ff4d4d';
              glowColor = 'rgba(255, 77, 77, 0.5)';
              alpha = 0.9;
            }

            const size = node.size * p.scale * pulseScale;

            // Glow
            const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 3);
            gradient.addColorStop(0, glowColor);
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.globalAlpha = alpha * 0.5;
            ctx.beginPath();
            ctx.arc(p.x, p.y, size * 3, 0, Math.PI * 2);
            ctx.fill();

            // Node
            ctx.globalAlpha = alpha;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
            ctx.fill();
          });

        ctx.globalAlpha = 1;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full perspective-1200">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ transform: 'rotateY(-15deg)', transformStyle: 'preserve-3d' }}
      />
    </div>
  );
}
