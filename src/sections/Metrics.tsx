import { useEffect, useRef, useState } from 'react';

interface Metric {
  value: string;
  numericValue: number;
  suffix: string;
  label: string;
  prefix?: string;
}

const metrics: Metric[] = [
  { value: '99.9', numericValue: 99.9, suffix: '%', label: '正常运行时间 SLA', prefix: '' },
  { value: '10,000', numericValue: 10000, suffix: '+', label: '每日协调的Agent', prefix: '' },
  { value: '50', numericValue: 50, suffix: 'ms', label: '平均响应时间', prefix: '<' },
];

function AnimatedNumber({ value, suffix, prefix = '', isVisible }: { value: number; suffix: string; prefix?: string; isVisible: boolean }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    const duration = 1500;
    const startTime = Date.now();
    const startValue = 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (value - startValue) * easeOut;

      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, isVisible]);

  const formattedValue = value >= 1000 
    ? Math.floor(displayValue).toLocaleString()
    : displayValue.toFixed(1);

  return (
    <span>
      {prefix && <span className="text-red-500">{prefix}</span>}
      {formattedValue}
      <span className="text-red-500">{suffix}</span>
    </span>
  );
}

export function Metrics() {
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
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-red-500/5 rounded-full blur-[200px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-red-500/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Title */}
        <div className="text-center mb-16">
          <h2
            className={`text-3xl sm:text-4xl lg:text-display-sm font-bold text-white mb-4 transition-all duration-600 ease-neural ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            企业级<span className="text-gradient-red">性能指标</span>
          </h2>
          <p
            className={`text-lg text-white/50 transition-all duration-600 ease-neural ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: '100ms' }}
          >
            为大规模生产环境设计的可靠性能
          </p>
        </div>

        {/* Metrics Dashboard */}
        <div
          className={`perspective-1500 transition-all duration-1000 ease-command ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div
            className="grid md:grid-cols-3 gap-6 preserve-3d transition-all duration-800 ease-neural"
            style={{
              transform: isVisible ? 'rotateX(0) rotateY(0)' : 'rotateX(20deg) rotateY(-10deg)',
            }}
          >
            {metrics.map((metric, index) => (
              <div
                key={metric.label}
                className={`relative group transition-all duration-700 ease-neural ${
                  isVisible ? 'opacity-100' : 'opacity-0'
                }`}
                style={{
                  transitionDelay: `${300 + index * 150}ms`,
                  transform: isVisible ? 'translateZ(50px) scale(1)' : 'translateZ(-100px) scale(0.8)',
                }}
              >
                <div className="relative glass-card rounded-2xl p-8 lg:p-10 border border-white/5 hover:border-red-500/30 transition-all duration-500 group-hover:shadow-glow-red group-hover:-translate-y-2">
                  {/* Animated Border */}
                  <div className="absolute inset-0 rounded-2xl overflow-hidden">
                    <div
                      className="absolute inset-[-100%] bg-gradient-to-r from-transparent via-red-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{
                        animation: 'rotate-border 4s linear infinite',
                      }}
                    />
                  </div>

                  {/* Content */}
                  <div className="relative z-10 text-center">
                    {/* Value */}
                    <div className="text-4xl sm:text-5xl lg:text-metric font-oswald font-semibold text-white mb-3">
                      <AnimatedNumber
                        value={metric.numericValue}
                        suffix={metric.suffix}
                        prefix={metric.prefix}
                        isVisible={isVisible}
                      />
                    </div>

                    {/* Label */}
                    <div className="text-white/50 text-sm sm:text-base">
                      {metric.label}
                    </div>
                  </div>

                  {/* Decorative Elements */}
                  <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-red-500/50 animate-pulse" />
                  <div className="absolute bottom-4 left-4 w-2 h-2 rounded-full bg-red-500/30 animate-pulse" style={{ animationDelay: '1s' }} />
                </div>

                {/* Connection Lines (visible on hover) */}
                {index < metrics.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-px">
                    <div className="w-full h-full bg-gradient-to-r from-red-500/30 to-transparent" />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 left-0 w-1 h-1 rounded-full bg-red-500 animate-data-packet"
                      style={{ animationDuration: '2s' }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Additional Info */}
        <div
          className={`mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-6 transition-all duration-600 ease-neural ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: '800ms' }}
        >
          {[
            { label: '全球节点', value: '15+' },
            { label: '支持语言', value: '12' },
            { label: '集成平台', value: '50+' },
            { label: '客户满意度', value: '4.9/5' },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between p-4 rounded-lg bg-white/[0.02] border border-white/5"
            >
              <span className="text-white/50 text-sm">{item.label}</span>
              <span className="text-white font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
