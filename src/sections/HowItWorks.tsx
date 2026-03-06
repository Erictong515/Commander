import { useEffect, useRef, useState } from 'react';
import { Plug, Workflow, BarChart3 } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Plug,
    title: '连接您的Agent',
    description: '与我们简单的 SDK 集成。支持 Python、Node.js、Go 等主流编程语言。只需几行代码，即可将您的 Agent 连接到 Commander 平台。',
    features: ['多语言 SDK', '自动发现', '安全认证'],
  },
  {
    number: '02',
    icon: Workflow,
    title: '定义工作流程',
    description: '使用我们直观的可视化编辑器创建复杂的工作流程。拖拽式界面让非技术人员也能轻松设计 Agent 协作流程。',
    features: ['可视化编辑器', '条件分支', '并行执行'],
  },
  {
    number: '03',
    icon: BarChart3,
    title: '监控和优化',
    description: '实时跟踪性能，接收 AI 驱动的优化建议。自动识别瓶颈，持续改进 Agent 效率。',
    features: ['实时仪表板', 'AI 建议', '成本优化'],
  },
];

export function HowItWorks() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);
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
    <section ref={sectionRef} className="relative py-32 bg-black overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[200px]" />
      </div>

      <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Title */}
        <div className="text-center mb-20">
          <h2
            className={`text-3xl sm:text-4xl lg:text-display-sm font-bold text-white mb-4 transition-all duration-800 ease-command ${
              isVisible ? 'opacity-100' : 'opacity-0'
            }`}
          >
            如何<span className="text-gradient-red">工作</span>
          </h2>
          <p
            className={`text-lg text-white/50 transition-all duration-600 ease-neural ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: '100ms' }}
          >
            三步即可开始协调您的 AI 劳动力
          </p>
        </div>

        {/* Steps */}
        <div className="relative space-y-16 lg:space-y-24">
          {/* Connection Line */}
          <div className="absolute left-8 lg:left-1/2 top-0 bottom-0 w-px hidden sm:block">
            <div className="w-full h-full bg-gradient-to-b from-red-500/50 via-red-500/20 to-transparent" />
          </div>

          {steps.map((step, index) => {
            const Icon = step.icon;
            const isEven = index % 2 === 1;
            const isActive = activeStep === index;

            return (
              <div
                key={step.number}
                className={`relative grid lg:grid-cols-2 gap-8 lg:gap-16 items-center transition-all duration-700 ease-neural ${
                  isVisible ? 'opacity-100' : 'opacity-0'
                }`}
                style={{
                  transitionDelay: `${200 + index * 200}ms`,
                  transform: isVisible
                    ? 'translateX(0) rotateY(0)'
                    : isEven
                    ? 'translateX(150px) rotateY(-25deg)'
                    : 'translateX(-150px) rotateY(25deg)',
                }}
                onMouseEnter={() => setActiveStep(index)}
                onMouseLeave={() => setActiveStep(null)}
              >
                {/* Content */}
                <div
                  className={`${isEven ? 'lg:order-2' : 'lg:order-1'} pl-16 sm:pl-20 lg:pl-0`}
                >
                  <div
                    className={`relative p-6 lg:p-8 rounded-2xl border border-white/5 bg-white/[0.02] transition-all duration-500 ${
                      isActive ? 'border-red-500/30 shadow-glow-red' : ''
                    }`}
                    style={{
                      transform: isActive ? 'translateZ(100px)' : 'translateZ(0)',
                    }}
                  >
                    {/* Step Number - Large Background */}
                    <div
                      className={`absolute -top-6 ${
                        isEven ? 'right-4' : '-left-4'
                      } text-[120px] font-bold leading-none text-red-500/[0.08] select-none pointer-events-none transition-all duration-500 ${
                        isActive ? 'text-red-500/[0.15]' : ''
                      }`}
                      style={{
                        textShadow: '1px 1px 0 rgba(255,0,0,0.1), 2px 2px 0 rgba(255,0,0,0.08), 3px 3px 0 rgba(255,0,0,0.05)',
                      }}
                    >
                      {step.number}
                    </div>

                    {/* Icon */}
                    <div
                      className={`w-14 h-14 rounded-xl bg-red-500/10 flex items-center justify-center mb-6 transition-all duration-500 ${
                        isActive ? 'scale-110 bg-red-500/20 rotate-[360deg]' : ''
                      }`}
                    >
                      <Icon className="w-7 h-7 text-red-500" strokeWidth={1.5} />
                    </div>

                    {/* Title */}
                    <h3 className="text-2xl font-bold text-white mb-4 relative z-10">
                      {step.title}
                    </h3>

                    {/* Description */}
                    <p className="text-white/60 leading-relaxed mb-6 relative z-10">
                      {step.description}
                    </p>

                    {/* Features */}
                    <div className="flex flex-wrap gap-2 relative z-10">
                      {step.features.map((feature) => (
                        <span
                          key={feature}
                          className="px-3 py-1 text-xs rounded-full bg-white/5 text-white/70 border border-white/10"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Visual/Illustration */}
                <div
                  className={`hidden lg:block ${isEven ? 'lg:order-1' : 'lg:order-2'}`}
                >
                  <div
                    className={`relative aspect-square max-w-[400px] mx-auto transition-all duration-500 ${
                      isActive ? 'scale-105' : ''
                    }`}
                  >
                    {/* Abstract Visualization */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        className={`w-48 h-48 rounded-full border border-red-500/20 transition-all duration-500 ${
                          isActive ? 'scale-110 border-red-500/40' : ''
                        }`}
                      />
                      <div
                        className={`absolute w-32 h-32 rounded-full border border-red-500/30 transition-all duration-500 ${
                          isActive ? 'scale-110 border-red-500/50' : ''
                        }`}
                      />
                      <div
                        className={`absolute w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center transition-all duration-500 ${
                          isActive ? 'scale-125 bg-red-500/30' : ''
                        }`}
                      >
                        <Icon className="w-8 h-8 text-red-500" />
                      </div>

                      {/* Orbiting Dots */}
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute w-full h-full animate-spin-slow"
                          style={{
                            animationDuration: `${15 + i * 5}s`,
                            animationDirection: i % 2 === 0 ? 'normal' : 'reverse',
                          }}
                        >
                          <div
                            className="absolute w-3 h-3 rounded-full bg-red-500/50"
                            style={{
                              top: `${20 + i * 15}%`,
                              left: `${50 + Math.sin(i) * 30}%`,
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Step Indicator Dot */}
                <div
                  className={`absolute left-4 lg:left-1/2 lg:-translate-x-1/2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black border-2 flex items-center justify-center transition-all duration-500 z-20 ${
                    isActive ? 'border-red-500 scale-125' : 'border-red-500/50'
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full bg-red-500 transition-all duration-500 ${
                      isActive ? 'animate-pulse' : ''
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
