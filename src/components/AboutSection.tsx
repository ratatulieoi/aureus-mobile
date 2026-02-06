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
              className="flex items-center gap-2 text-foreground hover:text-primary transition-smooth group"
            >
              <Instagram className="h-5 w-5 group-hover:scale-110 transition-smooth" />
              <span className="text-sm font-medium">@rmeydani_</span>
            </a>

            {/* GitHub */}
            <a
              href="https://github.com/ratatulieoi"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-foreground hover:text-primary transition-smooth group"
            >
              <Github className="h-5 w-5 group-hover:scale-110 transition-smooth" />
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
