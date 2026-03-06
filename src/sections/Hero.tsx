import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Play, ChevronDown } from 'lucide-react';
import { DataVisualization3D } from '@/components/custom/DataVisualization3D';

export function Hero() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const titleWords = ['掌控', '您的', 'AI', '劳动力'];

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen w-full overflow-hidden bg-black grid-bg"
    >
      {/* Background Grid Animation */}
      <div className="absolute inset-0 opacity-30">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255, 0, 0, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 0, 0, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            animation: 'diagonal-move 20s linear infinite',
          }}
        />
      </div>

      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-[150px] animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-red-500/5 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }} />

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 min-h-screen flex items-center">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center w-full">
          {/* Left Content */}
          <div className="space-y-8 perspective-1000">
            {/* Badge */}
            <div
              className={`transition-all duration-600 ease-neural ${
                isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'
              }`}
              style={{ transitionDelay: '200ms' }}
            >
              <Badge 
                variant="outline" 
                className="px-4 py-2 text-sm border-red-500/30 text-red-400 bg-red-500/5 backdrop-blur-sm animate-pulse-glow"
              >
                企业级 Agent 协调
              </Badge>
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-display font-bold text-white leading-tight">
              {titleWords.map((word, index) => (
                <span
                  key={index}
                  className={`inline-block mr-3 transition-all duration-800 ease-command ${
                    isVisible
                      ? 'opacity-100 rotate-x-0 translate-z-0'
                      : 'opacity-0'
                  }`}
                  style={{
                    transitionDelay: `${400 + index * 120}ms`,
                    transform: isVisible ? 'rotateX(0) translateZ(0)' : 'rotateX(-90deg) translateZ(-100px)',
                    transformStyle: 'preserve-3d',
                  }}
                >
                  {index === 2 ? (
                    <span className="text-gradient-red">{word}</span>
                  ) : (
                    word
                  )}
                </span>
              ))}
            </h1>

            {/* Subtitle */}
            <p
              className={`text-lg sm:text-xl text-white/60 max-w-xl leading-relaxed transition-all duration-500 ease-flow ${
                isVisible ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ transitionDelay: '900ms' }}
            >
              大规模部署、监控和优化智能Agent。
              <span className="text-white/80"> 实时可视性</span>，
              <span className="text-white/80"> 自动故障检测</span>，
              <span className="text-white/80"> 智能报告</span>。
            </p>

            {/* CTA Buttons */}
            <div
              className={`flex flex-wrap gap-4 pt-4 transition-all duration-500 ease-neural ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: '1200ms' }}
            >
              <Button
                size="lg"
                className="bg-red-500 hover:bg-red-600 text-white px-8 py-6 text-base font-medium transition-all duration-300 hover:scale-105 hover:shadow-glow-red-lg group"
              >
                开始免费试用
                <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/5 hover:border-white/40 px-8 py-6 text-base font-medium transition-all duration-300 group"
              >
                <Play className="mr-2 w-5 h-5 transition-transform group-hover:scale-110" />
                观看演示
              </Button>
            </div>

            {/* Stats */}
            <div
              className={`flex gap-8 pt-8 transition-all duration-500 ease-neural ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: '1400ms' }}
            >
              {[
                { value: '99.9%', label: '正常运行时间' },
                { value: '10K+', label: '每日Agent' },
                { value: '<50ms', label: '响应时间' },
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl sm:text-3xl font-oswald font-semibold text-white">
                    {stat.value}
                  </div>
                  <div className="text-xs sm:text-sm text-white/50">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content - 3D Visualization */}
          <div
            className={`relative h-[400px] sm:h-[500px] lg:h-[600px] transition-all duration-1200 ease-command ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-24'
            }`}
            style={{ transitionDelay: '600ms' }}
          >
            <div className="absolute inset-0 perspective-1200">
              <div 
                className="w-full h-full preserve-3d"
                style={{ transform: 'rotateY(-5deg)' }}
              >
                <DataVisualization3D />
              </div>
            </div>

            {/* Floating Cards */}
            <div 
              className="absolute top-4 right-4 glass-card rounded-lg p-3 animate-float"
              style={{ animationDelay: '0s' }}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-xs text-white/70">Agent 在线</span>
              </div>
              <div className="text-lg font-oswald font-semibold text-white mt-1">1,247</div>
            </div>

            <div 
              className="absolute bottom-8 left-4 glass-card rounded-lg p-3 animate-float"
              style={{ animationDelay: '1s' }}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                <span className="text-xs text-white/70">处理中</span>
              </div>
              <div className="text-lg font-oswald font-semibold text-white mt-1">89</div>
            </div>

            <div 
              className="absolute top-1/2 right-0 glass-card rounded-lg p-3 animate-float"
              style={{ animationDelay: '2s' }}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs text-white/70">异常</span>
              </div>
              <div className="text-lg font-oswald font-semibold text-white mt-1">3</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce-subtle">
        <span className="text-xs text-white/40">向下滚动</span>
        <ChevronDown className="w-5 h-5 text-white/40" />
      </div>
    </section>
  );
}
