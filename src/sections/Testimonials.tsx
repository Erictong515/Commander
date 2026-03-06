import { useEffect, useRef, useState } from 'react';
import { Quote, ChevronLeft, ChevronRight, Star } from 'lucide-react';

const testimonials = [
  {
    quote: 'Agents Commander 彻底改变了我们管理 AI 运营的方式。从手动监控数百个 Agent 到一键掌控全局，效率提升了 10 倍。',
    author: '陈明辉',
    role: 'TechFlow 首席执行官',
    avatar: 'CM',
    rating: 5,
  },
  {
    quote: '正常运行时间和性能监控为我们节省了数千美元的潜在停机损失。智能告警系统总能在问题影响用户前就发现并解决。',
    author: '王雪婷',
    role: 'DataPulse 首席技术官',
    avatar: 'WX',
    rating: 5,
  },
  {
    quote: '我们在 10 分钟内完成了整个 Agent 集群的部署。难以置信的速度和稳定性，这正是我们寻找的企业级解决方案。',
    author: '李志强',
    role: 'CloudMind 工程副总裁',
    avatar: 'LZ',
    rating: 5,
  },
];

export function Testimonials() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Auto-rotate
  useEffect(() => {
    if (!isVisible) return;

    intervalRef.current = setInterval(() => {
      goToNext();
    }, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isVisible, activeIndex]);

  const goToNext = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
    setTimeout(() => setIsAnimating(false), 800);
  };

  const goToPrev = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    setTimeout(() => setIsAnimating(false), 800);
  };

  const getCardStyle = (index: number) => {
    const diff = index - activeIndex;
    const normalizedDiff = ((diff + testimonials.length) % testimonials.length);
    
    if (normalizedDiff === 0) {
      return {
        transform: 'translateX(0) translateZ(0) rotateY(0)',
        opacity: 1,
        zIndex: 10,
      };
    } else if (normalizedDiff === 1 || normalizedDiff === -2) {
      return {
        transform: 'translateX(80%) translateZ(-200px) rotateY(-45deg) scale(0.8)',
        opacity: 0.5,
        zIndex: 5,
      };
    } else {
      return {
        transform: 'translateX(-80%) translateZ(-200px) rotateY(45deg) scale(0.8)',
        opacity: 0.5,
        zIndex: 5,
      };
    }
  };

  return (
    <section ref={sectionRef} className="relative py-32 bg-black overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-500/5 rounded-full blur-[200px]" />
      </div>

      <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Title */}
        <div className="text-center mb-20">
          <h2
            className={`text-3xl sm:text-4xl lg:text-display-sm font-bold text-white mb-4 transition-all duration-700 ease-neural ${
              isVisible ? 'opacity-100 blur-0' : 'opacity-0 blur-[20px]'
            }`}
          >
            客户怎么<span className="text-gradient-red">说</span>
          </h2>
        </div>

        {/* Carousel */}
        <div
          className={`relative perspective-1000 transition-all duration-700 ease-neural ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ transitionDelay: '200ms' }}
        >
          {/* Quote Mark */}
          <div
            className={`absolute -top-8 left-1/2 -translate-x-1/2 transition-all duration-800 ease-elastic ${
              isVisible ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-[180deg] scale-0'
            }`}
            style={{ transitionDelay: '200ms' }}
          >
            <Quote className="w-16 h-16 text-red-500/20" />
          </div>

          {/* Cards Container */}
          <div className="relative h-[400px] sm:h-[350px] flex items-center justify-center preserve-3d">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="absolute w-full max-w-2xl px-4 transition-all duration-800 ease-neural"
                style={getCardStyle(index)}
              >
                <div className="glass-card rounded-2xl p-8 sm:p-10 border border-white/5">
                  {/* Rating */}
                  <div className="flex gap-1 mb-6">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-5 h-5 fill-red-500 text-red-500"
                      />
                    ))}
                  </div>

                  {/* Quote */}
                  <blockquote className="text-lg sm:text-xl text-white/80 leading-relaxed mb-8">
                    "{testimonial.quote}"
                  </blockquote>

                  {/* Author */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white font-semibold">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="text-white font-medium">
                        {testimonial.author}
                      </div>
                      <div className="text-white/50 text-sm">
                        {testimonial.role}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={goToPrev}
              className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-red-500/50 hover:bg-red-500/10 transition-all duration-300"
              disabled={isAnimating}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Dots */}
            <div className="flex gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (!isAnimating) {
                      setIsAnimating(true);
                      setActiveIndex(index);
                      setTimeout(() => setIsAnimating(false), 800);
                    }
                  }}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === activeIndex
                      ? 'w-8 bg-red-500'
                      : 'bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={goToNext}
              className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-red-500/50 hover:bg-red-500/10 transition-all duration-300"
              disabled={isAnimating}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
