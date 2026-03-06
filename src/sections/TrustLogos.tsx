import { useEffect, useRef, useState } from 'react';

const logos = [
  { name: 'TechFlow', svg: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
  { name: 'DataPulse', svg: 'M3 3v18h18M7 16l4-4 4 4 6-6' },
  { name: 'CloudMind', svg: 'M17.5 19c0-1.7-1.3-3-3-3h-5c-1.7 0-3 1.3-3 3M20 19a5 5 0 00-5-5h-6a5 5 0 00-5 5' },
  { name: 'NeuralNet', svg: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a6 6 0 110 12 6 6 0 010-12z' },
  { name: 'AIVenture', svg: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
  { name: 'SynthMind', svg: 'M13 10V3L4 14h7v7l9-11h-7z' },
];

export function TrustLogos() {
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
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-20 bg-black overflow-hidden">
      {/* Title */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <h2
          className={`text-center text-lg text-white/50 transition-all duration-600 ease-neural ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          深受<span className="text-white/70">创新团队</span>信赖
        </h2>
      </div>

      {/* Marquee Container */}
      <div className="relative">
        {/* Gradient Masks */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-black to-transparent z-10" />

        {/* First Row - Left to Right */}
        <div
          className={`flex mb-8 transition-all duration-800 ease-flow ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: '400ms' }}
        >
          <div className="flex animate-marquee">
            {[...logos, ...logos].map((logo, index) => (
              <div
                key={`row1-${index}`}
                className="flex items-center justify-center mx-12 group cursor-pointer"
              >
                <div className="flex items-center gap-3 opacity-40 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-300">
                  <svg
                    className="w-8 h-8 text-white group-hover:text-red-500 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d={logo.svg}
                    />
                  </svg>
                  <span className="text-lg font-medium text-white group-hover:text-white transition-colors">
                    {logo.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Second Row - Right to Left */}
        <div
          className={`flex transition-all duration-800 ease-flow ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'
          }`}
          style={{ transitionDelay: '600ms' }}
        >
          <div className="flex animate-marquee-reverse">
            {[...logos.reverse(), ...logos].map((logo, index) => (
              <div
                key={`row2-${index}`}
                className="flex items-center justify-center mx-12 group cursor-pointer"
              >
                <div className="flex items-center gap-3 opacity-40 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-300">
                  <svg
                    className="w-8 h-8 text-white group-hover:text-red-500 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d={logo.svg}
                    />
                  </svg>
                  <span className="text-lg font-medium text-white group-hover:text-white transition-colors">
                    {logo.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
