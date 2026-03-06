import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Sparkles, Building2, Rocket } from 'lucide-react';

const plans = [
  {
    name: '入门版',
    icon: Rocket,
    price: '29',
    period: '/月',
    description: '适合小型团队和初创公司',
    features: [
      '最多 10 个Agent',
      '基础监控',
      '邮件支持',
      '7 天数据保留',
      '标准 API 访问',
    ],
    cta: '开始免费试用',
    highlighted: false,
  },
  {
    name: '专业版',
    icon: Sparkles,
    price: '99',
    period: '/月',
    description: '适合成长中的团队',
    features: [
      '最多 100 个Agent',
      '高级分析',
      '优先支持',
      '90 天数据保留',
      '自定义集成',
      '团队协作',
      'API 速率提升',
    ],
    cta: '开始免费试用',
    highlighted: true,
    badge: '推荐',
  },
  {
    name: '企业版',
    icon: Building2,
    price: '定制',
    period: '',
    description: '适合大型组织',
    features: [
      '无限Agent',
      '专属客户经理',
      'SLA 保障',
      '无限数据保留',
      '本地部署选项',
      '定制开发',
      '7x24 电话支持',
    ],
    cta: '联系销售',
    highlighted: false,
  },
];

export function Pricing() {
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredPlan, setHoveredPlan] = useState<number | null>(null);
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
    <section ref={sectionRef} id="pricing" className="relative py-32 bg-black overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-red-500/5 rounded-full blur-[200px]" />
      </div>

      <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Title */}
        <div className="text-center mb-16">
          <h2
            className={`text-3xl sm:text-4xl lg:text-display-sm font-bold text-white mb-4 transition-all duration-600 ease-neural ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            简单透明的<span className="text-gradient-red">定价</span>
          </h2>
          <p
            className={`text-lg text-white/50 transition-all duration-600 ease-neural ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: '100ms' }}
          >
            按需扩展。随时取消。
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 perspective-1200">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            const isHovered = hoveredPlan === index;
            const isOtherHovered = hoveredPlan !== null && hoveredPlan !== index;

            return (
              <div
                key={plan.name}
                className={`relative transition-all duration-700 ease-neural ${
                  isVisible ? 'opacity-100' : 'opacity-0'
                }`}
                style={{
                  transitionDelay: `${200 + index * 200}ms`,
                  transform: isVisible
                    ? 'rotateY(0) translateX(0)'
                    : index === 0
                    ? 'rotateY(-90deg) translateX(-100px)'
                    : index === 2
                    ? 'rotateY(90deg) translateX(100px)'
                    : 'scale(0.8)',
                }}
                onMouseEnter={() => setHoveredPlan(index)}
                onMouseLeave={() => setHoveredPlan(null)}
              >
                <div
                  className={`relative h-full rounded-2xl p-6 lg:p-8 transition-all duration-500 preserve-3d ${
                    plan.highlighted
                      ? 'bg-gradient-to-b from-red-500/10 to-transparent border-2 border-red-500/50'
                      : 'bg-white/[0.02] border border-white/5'
                  } ${isHovered ? 'translate-y-[-10px] translate-z-[30px]' : ''} ${
                    isOtherHovered ? 'opacity-60' : ''
                  }`}
                >
                  {/* Highlighted Badge */}
                  {plan.badge && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="px-4 py-1 bg-red-500 text-white text-sm font-medium rounded-full animate-pulse-glow">
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  {/* Rotating Border for Pro */}
                  {plan.highlighted && (
                    <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                      <div
                        className="absolute inset-[-50%] bg-gradient-to-r from-transparent via-red-500/20 to-transparent"
                        style={{ animation: 'rotate-border 4s linear infinite' }}
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="relative z-10">
                    {/* Icon */}
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${
                        plan.highlighted
                          ? 'bg-red-500/20'
                          : 'bg-white/5'
                      }`}
                    >
                      <Icon
                        className={`w-6 h-6 ${
                          plan.highlighted ? 'text-red-500' : 'text-white/60'
                        }`}
                      />
                    </div>

                    {/* Plan Name */}
                    <h3 className="text-xl font-bold text-white mb-2">
                      {plan.name}
                    </h3>

                    {/* Description */}
                    <p className="text-white/50 text-sm mb-6">
                      {plan.description}
                    </p>

                    {/* Price */}
                    <div className="mb-8">
                      <span className="text-4xl lg:text-5xl font-oswald font-semibold text-white">
                        {plan.price !== '定制' && '$'}
                        {plan.price}
                      </span>
                      <span className="text-white/50">{plan.period}</span>
                    </div>

                    {/* Features */}
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature, i) => (
                        <li
                          key={feature}
                          className={`flex items-center gap-3 text-sm text-white/70 transition-all duration-300 ${
                            isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
                          }`}
                          style={{
                            transitionDelay: `${800 + i * 100}ms`,
                          }}
                        >
                          <Check
                            className={`w-5 h-5 flex-shrink-0 transition-all duration-300 ${
                              isHovered ? 'text-red-500 scale-110' : 'text-red-500/70'
                            }`}
                          />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <Button
                      className={`w-full py-6 transition-all duration-300 ${
                        plan.highlighted
                          ? 'bg-red-500 hover:bg-red-600 text-white hover:shadow-glow-red'
                          : 'bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-red-500/30'
                      }`}
                    >
                      {plan.cta}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Enterprise Note */}
        <div
          className={`mt-12 text-center transition-all duration-600 ease-neural ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: '1000ms' }}
        >
          <p className="text-white/40 text-sm">
            所有计划均包含 14 天免费试用。无需信用卡。
          </p>
        </div>
      </div>
    </section>
  );
}
