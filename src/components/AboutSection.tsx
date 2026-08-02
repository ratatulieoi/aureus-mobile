import React from 'react';
import { Instagram, Github } from 'lucide-react';

const AboutSection: React.FC = () => {
  return (
    <section className="py-12 mb-20">
      <div>
        <div className="rounded-xl border bg-card p-8 text-center space-y-6 shadow-sm">
          {/* Title */}
          <h2 className="text-2xl font-bold text-foreground">
            hi there! 
          </h2>

          {/* Subtitle */}
          <p className="text-sm text-muted-foreground font-medium">
            Thanks for using my app! This project is open-source and available on GitHub. Feel free to check it out, contribute, or report any issues you find.
          </p>

          {/* Social Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 py-4">
            {/* Instagram */}
            <a
              href="https://instagram.com/rmeydani_"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Buka Instagram @rmeydani_ di tab baru"
              className="group flex min-h-11 items-center gap-2 rounded-md px-2 text-foreground ring-offset-background transition-colors hover:text-accent-text focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Instagram aria-hidden="true" className="h-5 w-5 transition-transform group-hover:scale-110" />
              <span className="text-sm font-medium">@rmeydani_</span>
            </a>

            {/* GitHub */}
            <a
              href="https://github.com/ratatulieoi"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Buka GitHub ratatulieoi di tab baru"
              className="group flex min-h-11 items-center gap-2 rounded-md px-2 text-foreground ring-offset-background transition-colors hover:text-accent-text focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Github aria-hidden="true" className="h-5 w-5 transition-transform group-hover:scale-110" />
              <span className="text-sm font-medium">ratatulieoi</span>
            </a>
          </div>

          {/* Humble Quote */}
          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground italic">
              "how to center a div?"
            </p>
          </div>

          {/* App Version */}
          <div className="pt-2">
            <p className="text-xs text-muted-foreground">
              Aureus v2.1 - 2026
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
