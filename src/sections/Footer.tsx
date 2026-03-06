import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Cpu, Twitter, Linkedin, Github, ArrowRight } from 'lucide-react';

const footerLinks = {
  product: {
    title: '产品',
    links: [
      { label: '功能', href: '#features' },
      { label: '定价', href: '#pricing' },
      { label: '集成', href: '#' },
      { label: '更新日志', href: '#' },
    ],
  },
  resources: {
    title: '资源',
    links: [
      { label: '文档', href: '#' },
      { label: 'API 参考', href: '#' },
      { label: '博客', href: '#' },
      { label: '社区', href: '#' },
    ],
  },
  company: {
    title: '公司',
    links: [
      { label: '关于我们', href: '#' },
      { label: '职业机会', href: '#' },
      { label: '联系我们', href: '#' },
      { label: '合作伙伴', href: '#' },
    ],
  },
};

const socialLinks = [
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
  { icon: Github, href: '#', label: 'GitHub' },
];

export function Footer() {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const footerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (footerRef.current) {
      observer.observe(footerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle subscription
    setEmail('');
  };

  return (
    <footer ref={footerRef} className="relative bg-black border-t border-white/5">
      {/* Animated Divider */}
      <div className="absolute top-0 left-0 right-0 h-px overflow-hidden">
        <div
          className="w-full h-full"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255, 0, 0, 0.5), transparent)',
            backgroundSize: '200% 100%',
            animation: 'gradient-shift 6s linear infinite',
          }}
        />
      </div>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-12">
          {/* Logo & Description */}
          <div
            className={`col-span-2 transition-all duration-600 ease-neural ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <a href="#" className="flex items-center gap-2 mb-4 group">
              <div className="relative">
                <Cpu className="w-8 h-8 text-red-500" />
                <div className="absolute inset-0 animate-pulse-glow rounded-full" />
              </div>
              <span className="text-xl font-bold text-white">
                Agents<span className="text-red-500">Commander</span>
              </span>
            </a>
            <p className="text-white/50 text-sm mb-6 max-w-xs">
              大规模智能Agent协调。实时掌握 1000+ Agent 的运行状态。
            </p>

            {/* Newsletter */}
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <Input
                type="email"
                placeholder="输入您的邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-red-500/50"
              />
              <Button
                type="submit"
                size="icon"
                className="bg-red-500 hover:bg-red-600 shrink-0"
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([key, section], index) => (
            <div
              key={key}
              className={`transition-all duration-500 ease-neural ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${250 + index * 100}ms` }}
            >
              <h4 className="text-white font-semibold mb-4">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-white/50 text-sm hover:text-red-500 transition-all duration-300 hover:translate-x-1 inline-block relative group"
                    >
                      {link.label}
                      <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-red-500 transition-all duration-300 group-hover:w-full" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Social */}
          <div
            className={`col-span-2 md:col-span-1 transition-all duration-500 ease-neural ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: '550ms' }}
          >
            <h4 className="text-white font-semibold mb-4">关注我们</h4>
            <div className="flex gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/50 hover:text-red-500 hover:bg-red-500/10 transition-all duration-400 hover:scale-110 hover:rotate-[360deg]"
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          className={`mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 transition-all duration-400 ease-flow ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ transitionDelay: '900ms' }}
        >
          <p className="text-white/40 text-sm">
            © 2024 Agents Commander。保留所有权利。
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-white/40 text-sm hover:text-white/60 transition-colors">
              隐私政策
            </a>
            <a href="#" className="text-white/40 text-sm hover:text-white/60 transition-colors">
              服务条款
            </a>
            <a href="#" className="text-white/40 text-sm hover:text-white/60 transition-colors">
              Cookie 设置
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
