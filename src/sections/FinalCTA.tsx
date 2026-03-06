import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, MessageCircle } from 'lucide-react';

export function FinalCTA() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-32 bg-black overflow-hidden">
      {/* Diagonal Background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(110deg, #000000 50%, #0a0000 50%)',
        }}
      />

      {/* Animated Grid Lines */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              110deg,
              transparent,
              transparent 50px,
              rgba(255, 0, 0, 0.03) 50px,
              rgba(255, 0, 0, 0.03) 51px
            )
          `,
          animation: 'diagonal-move 10s linear infinite',
        }}
      />

      {/* Glow Effect */}
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-red-500/10 rounded-full blur-[200px]" />

      <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8 perspective-1000">
            {/* Title */}
            <h2
              className={`text-3xl sm:text-4xl lg:text-display-sm font-bold text-white transition-all duration-800 ease-neural ${
                isVisible ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                transform: isVisible ? 'rotateX(0) translateZ(0)' : 'rotateX(-90deg) translateZ(-100px)',
                transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                transitionDelay: '300ms',
              }}
            >
              准备好扩展您的
              <span className="text-gradient-red"> AI 运营</span>了吗？
            </h2>

            {/* Description */}
            <p
              className={`text-lg text-white/60 max-w-lg transition-all duration-600 ease-flow ${
                isVisible ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ transitionDelay: '600ms' }}
            >
              加入已经使用 Agents Commander 变革其工作流程的 500+ 团队。
              开始您的 14 天免费试用，无需信用卡。
            </p>

            {/* CTA Buttons */}
            <div
              className={`flex flex-wrap gap-4 transition-all duration-600 ease-neural ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: '900ms' }}
            >
              <Button
                size="lg"
                className="bg-red-500 hover:bg-red-600 text-white px-8 py-6 text-base font-medium transition-all duration-300 hover:scale-105 hover:shadow-glow-red-lg group"
              >
                免费开始
                <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/5 hover:border-red-500/30 px-8 py-6 text-base font-medium transition-all duration-300"
              >
                <MessageCircle className="mr-2 w-5 h-5" />
                联系销售
              </Button>
            </div>

            {/* Trust Badges */}
            <div
              className={`flex flex-wrap items-center gap-6 pt-4 transition-all duration-600 ease-neural ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: '1050ms' }}
            >
              {[
                '无需信用卡',
                '14 天免费试用',
                '随时取消',
              ].map((badge) => (
                <div key={badge} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span className="text-sm text-white/50">{badge}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content - 3D Visualization */}
          <div
            className={`relative h-[300px] sm:h-[400px] hidden lg:block transition-all duration-1000 ease-command ${
              isVisible ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ transitionDelay: '400ms' }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Central Hub */}
              <div className="relative w-32 h-32">
                <div className="absolute inset-0 rounded-full border-2 border-red-500/30 animate-pulse-glow" />
                <div className="absolute inset-4 rounded-full border border-red-500/20" />
                <div className="absolute inset-8 rounded-full bg-red-500/20 flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
                </div>

                {/* Orbiting Elements */}
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute inset-[-60px] animate-spin-slow"
                    style={{
                      animationDuration: `${20 + i * 5}s`,
                      animationDirection: i % 2 === 0 ? 'normal' : 'reverse',
                    }}
                  >
                    <div
                      className="absolute w-4 h-4 rounded-full bg-red-500/40"
                      style={{
                        top: '0',
                        left: '50%',
                        transform: 'translateX(-50%)',
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Outer Rings */}
              <div className="absolute w-64 h-64 rounded-full border border-red-500/10" />
              <div className="absolute w-80 h-80 rounded-full border border-red-500/5" />

              {/* Floating Nodes */}
              {[...Array(8)].map((_, i) => (
                <div
                  key={`node-${i}`}
                  className="absolute animate-float"
                  style={{
                    top: `${20 + Math.random() * 60}%`,
                    left: `${20 + Math.random() * 60}%`,
                    animationDelay: `${i * 0.5}s`,
                    animationDuration: `${4 + Math.random() * 2}s`,
                  }}
                >
                  <div className="w-2 h-2 rounded-full bg-red-500/30" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
