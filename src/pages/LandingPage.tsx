import { Navbar } from '../sections/Navbar';
import { Hero } from '../sections/Hero';
import { TrustLogos } from '../sections/TrustLogos';
import { Features } from '../sections/Features';
import { Metrics } from '../sections/Metrics';
import { HowItWorks } from '../sections/HowItWorks';
import { Testimonials } from '../sections/Testimonials';
import { Pricing } from '../sections/Pricing';
import { FAQ } from '../sections/FAQ';
import { FinalCTA } from '../sections/FinalCTA';
import { Footer } from '../sections/Footer';

export function LandingPage() {
    return (
        <div className="min-h-screen bg-black text-white overflow-x-hidden">
            <Navbar />
            <main>
                <Hero />
                <TrustLogos />
                <Features />
                <Metrics />
                <HowItWorks />
                <Testimonials />
                <Pricing />
                <FAQ />
                <FinalCTA />
            </main>
            <Footer />
        </div>
    );
}
