import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'Agents Commander 支持哪些编程语言？',
    answer: '我们提供官方 SDK 支持 Python、Node.js、Go、Java 和 Rust。此外，我们的 REST API 允许您使用任何能够发起 HTTP 请求的编程语言进行集成。所有 SDK 都包含完整的类型定义和文档。',
  },
  {
    question: '如何扩展以管理数千个 Agent？',
    answer: 'Agents Commander 采用分布式架构设计，可水平扩展以支持 10,000+ 个 Agent。我们的自动负载均衡和分片技术确保即使在大规模部署下也能保持亚秒级响应时间。企业版还包括 dedicated infrastructure 选项。',
  },
  {
    question: '数据安全和隐私如何保障？',
    answer: '安全是我们的首要任务。所有数据传输使用 TLS 1.3 加密，支持静态数据加密。我们通过了 SOC 2 Type II 认证，并提供 GDPR 合规工具。企业版支持本地部署，数据完全保留在您的基础设施中。',
  },
  {
    question: '我可以本地部署吗？',
    answer: '是的，企业版支持完全本地部署。我们提供 Kubernetes Helm charts 和 Docker Compose 配置，让您可以在自己的数据中心或私有云中运行 Agents Commander。我们的团队将协助您完成部署和配置。',
  },
  {
    question: '正常运行时间保证是多少？',
    answer: '我们的云服务提供 99.9% 的 SLA 正常运行时间保证，专业版和企业版用户可获得服务积分补偿。我们的基础设施部署在多个可用区，具备自动故障转移能力，确保您的 Agent 协调服务始终可用。',
  },
];

export function FAQ() {
  const [isVisible, setIsVisible] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
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
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-red-500/5 rounded-full blur-[200px]" />
      </div>

      <div className="relative z-10 max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Title */}
        <div className="text-center mb-16">
          <h2
            className={`text-3xl sm:text-4xl lg:text-display-sm font-bold text-white mb-4 transition-all duration-600 ease-neural ${
              isVisible ? 'opacity-100 blur-0' : 'opacity-0 blur-[15px]'
            }`}
          >
            常见<span className="text-gradient-red">问题</span>
          </h2>
          <p
            className={`text-lg text-white/50 transition-all duration-600 ease-neural ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: '100ms' }}
          >
            还有其他问题？<a href="#" className="text-red-500 hover:underline">联系我们的支持团队</a>
          </p>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={index}
                className={`transition-all duration-500 ease-neural ${
                  isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-20'
                }`}
                style={{ transitionDelay: `${150 + index * 100}ms` }}
              >
                <div
                  className={`relative rounded-xl border transition-all duration-500 ${
                    isOpen
                      ? 'border-red-500/30 bg-white/[0.03] shadow-glow-red-subtle'
                      : 'border-white/5 bg-white/[0.02] hover:border-white/10'
                  }`}
                  style={{
                    transform: isOpen ? 'translateZ(30px)' : 'translateZ(0)',
                  }}
                >
                  {/* Question Number */}
                  <div
                    className={`absolute -left-2 sm:-left-4 top-1/2 -translate-y-1/2 text-5xl sm:text-7xl font-bold text-red-500/[0.08] select-none pointer-events-none transition-all duration-500 ${
                      isOpen ? 'text-red-500/[0.15]' : ''
                    }`}
                    style={{
                      textShadow: '1px 1px 0 rgba(255,0,0,0.1), 2px 2px 0 rgba(255,0,0,0.08)',
                    }}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </div>

                  {/* Question Button */}
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="w-full flex items-center justify-between p-6 sm:p-8 text-left group"
                  >
                    <span
                      className={`text-base sm:text-lg font-medium pr-8 transition-colors duration-300 ${
                        isOpen ? 'text-red-500' : 'text-white group-hover:text-white/80'
                      }`}
                    >
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 flex-shrink-0 transition-all duration-400 ${
                        isOpen
                          ? 'text-red-500 rotate-180'
                          : 'text-white/40 group-hover:text-white/60'
                      }`}
                    />
                  </button>

                  {/* Answer */}
                  <div
                    className={`overflow-hidden transition-all duration-500 ease-elastic ${
                      isOpen ? 'max-h-96' : 'max-h-0'
                    }`}
                  >
                    <div className="px-6 sm:px-8 pb-6 sm:pb-8">
                      <div className="h-px bg-white/5 mb-4" />
                      <p className="text-white/60 leading-relaxed">
                        {faq.answer}
                      </p>
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
