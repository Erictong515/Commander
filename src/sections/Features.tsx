import { useEffect, useRef, useState } from 'react';
import { Rocket, Activity, TrendingUp } from 'lucide-react';

const features = [
  {
    icon: Rocket,
    title: '部署',
    description: '一键部署Agent到任何环境。支持 AWS、GCP、Azure 和本地基础设施。',
    color: 'from-red-500/20 to-red-600/10',
  },
  {
    icon: Activity,
    title: '监控',
    description: '实时指标、日志和性能数据。自定义仪表板和自动告警。',
    color: 'from-red-500/20 to-orange-500/10',
  },
  {
    icon: TrendingUp,
    title: '优化',
    description: 'AI 驱动的建议，用于提升 Agent 效率和降低成本。',
    color: 'from-orange-500/20 to-yellow-500/10',
  },
];

export function Features() {
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="features"
      className="relative py-32 bg-black overflow-hidden"
    >
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-500/5 rounded-full blur-[200px]" />
      </div>

      <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Title */}
        <div className="text-center mb-20">
          <h2
            className={`text-3xl sm:text-4xl lg:text-display-sm font-bold text-white mb-6 transition-all duration-800 ease-command ${
              isVisible ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              clipPath: isVisible ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)',
              transition: 'clip-path 0.8s cubic-bezier(0.87, 0, 0.13, 1), opacity 0.8s',
            }}
          >
            强大的<span className="text-gradient-red">核心功能</span>
          </h2>
          <p
            className={`text-lg text-white/50 max-w-2xl mx-auto transition-all duration-600 ease-neural ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: '200ms' }}
          >
            从部署到优化，我们提供完整的 Agent 生命周期管理
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-0 perspective-1000">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const isHovered = hoveredIndex === index;
            const isOtherHovered = hoveredIndex !== null && hoveredIndex !== index;

            return (
              <div
                key={feature.title}
                className={`relative group transition-all duration-700 ease-neural ${
                  isVisible ? 'opacity-100' : 'opacity-0'
                }`}
                style={{
                  transitionDelay: `${200 + index * 150}ms`,
                  transform: isVisible
                    ? `translateX(0) rotateY(0)`
                    : index === 0
                    ? 'translateX(-100px) rotateY(15deg)'
                    : index === 2
                    ? 'translateX(100px) rotateY(-15deg)'
                    : 'scale(0.8)',
                }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Divider Line */}
                {index > 0 && (
                  <div className="absolute left-0 top-1/4 bottom-1/4 w-px bg-gradient-to-b from-transparent via-red-500/30 to-transparent hidden md:block" />
                )}

                <div
                  className={`relative p-8 lg:p-12 h-full transition-all duration-500 ease-neural preserve-3d ${
                    isHovered ? 'translate-z-[30px] -translate-y-2' : ''
                  } ${isOtherHovered ? 'opacity-60' : 'opacity-100'}`}
                  style={{
                    transform: isHovered
                      ? 'translateZ(30px) translateY(-10px)'
                      : `translateZ(${index === 1 ? 0 : -50}px)`,
                  }}
                >
                  {/* Background Gradient */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl`}
                  />

                  {/* Border Glow */}
                  <div
                    className={`absolute inset-0 rounded-2xl border border-red-500/0 group-hover:border-red-500/30 transition-all duration-500 ${
                      isHovered ? 'shadow-glow-red' : ''
                    }`}
                  />

                  {/* Content */}
                  <div className="relative z-10">
                    {/* Icon */}
                    <div className="mb-8">
                      <div
                        className={`w-16 h-16 rounded-xl bg-red-500/10 flex items-center justify-center transition-all duration-500 ${
                          isHovered ? 'scale-110 bg-red-500/20' : ''
                        }`}
                      >
                        <Icon
                          className={`w-8 h-8 text-red-500 transition-all duration-500 ${
                            isHovered ? 'animate-float' : ''
                          }`}
                          strokeWidth={1.5}
                        />
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-2xl font-bold text-white mb-4">
                      {feature.title}
                    </h3>

                    {/* Description */}
                    <p className="text-white/60 leading-relaxed">
                      {feature.description}
                    </p>

                    {/* Learn More Link */}
                    <div
                      className={`mt-8 flex items-center gap-2 text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-300 ${
                        isHovered ? 'translate-x-0' : '-translate-x-4'
                      }`}
                    >
                      <span className="text-sm font-medium">了解更多</span>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 8l4 4m0 0l-4 4m4-4H3"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
