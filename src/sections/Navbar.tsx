import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X, Cpu } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: '功能', href: '#features' },
    { label: '定价', href: '#pricing' },
    { label: '文档', href: '#docs' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-neural ${isScrolled
        ? 'h-[60px] glass-dark border-b border-white/5'
        : 'h-[80px] bg-transparent'
        }`}
    >
      <div className="max-w-[1200px] mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Logo */}
        <a
          href="#"
          className={`flex items-center gap-2 transition-all duration-500 ease-neural ${isScrolled ? 'scale-[0.85]' : 'scale-100'
            }`}
        >
          <div className="relative">
            <Cpu className="w-8 h-8 text-red-500" />
            <div className="absolute inset-0 animate-pulse-glow rounded-full" />
          </div>
          <span className="text-xl font-bold text-white">
            Agents<span className="text-red-500">Commander</span>
          </span>
        </a>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="relative text-sm text-white/70 hover:text-white transition-colors duration-250 group"
            >
              {link.label}
              <span className="absolute -bottom-1 left-1/2 w-0 h-[2px] bg-red-500 transition-all duration-250 ease-neural group-hover:w-full group-hover:left-0" />
            </a>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="hidden md:flex items-center gap-4">
          <Link to="/dashboard">
            <Button
              variant="ghost"
              className="text-white/70 hover:text-white hover:bg-white/5"
            >
              登录
            </Button>
          </Link>
          <Link to="/login">
            <Button className="bg-red-500 hover:bg-red-600 text-white px-6 transition-all duration-300 hover:scale-105 hover:shadow-glow-red">
              进入控制台
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-white p-2"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden absolute top-full left-0 right-0 glass-dark border-b border-white/5 transition-all duration-300 ease-neural ${isMobileMenuOpen
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 -translate-y-4 pointer-events-none'
          }`}
      >
        <div className="px-4 py-6 space-y-4">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="block text-white/70 hover:text-white py-2 transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="pt-4 space-y-3">
            <Link to="/login">
              <Button
                variant="ghost"
                className="w-full text-white/70 hover:text-white hover:bg-white/5"
              >
                登录
              </Button>
            </Link>
            <Link to="/login">
              <Button className="w-full bg-red-500 hover:bg-red-600 text-white">
                进入控制台
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
