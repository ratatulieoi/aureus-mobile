import React from 'react';
import { cn } from '@/lib/utils';

interface BrandMarkProps extends React.SVGProps<SVGSVGElement> {
  title?: string;
}

const BrandMark: React.FC<BrandMarkProps> = ({ className, title, ...props }) => (
  <svg
    viewBox="0 0 66 100"
    className={cn('brand-mark', className)}
    aria-hidden={title ? undefined : true}
    role={title ? 'img' : undefined}
    {...props}
  >
    {title && <title>{title}</title>}
    <path d="M13.2 1.1C19.3-.5 25.4.4 31.4 3.1L55.7 14.1C61.7 16.8 65.1 20.8 65 25.7c-.1 6.1-4.4 10.4-12 12.4l-19.7 4.7c-9.6 2.3-16.5.3-21-5.4L4.9 28C1.3 23.4.1 19.1 1.2 14.4 2.7 8 6.8 2.9 13.2 1.1Z" />
    <path d="M33.6 51.1c5.5-.4 11.2-.1 17 .9 6.7 1.2 10.2 4.4 10.3 9.2.1 4.6-3.2 7.7-9.8 9.5l-13.5 3.5c-7.5 2-13.1 1.4-17-.9-3.3-2-4.8-4.9-4.5-8.7.3-4 2.4-7.2 6.3-9.5 3.1-1.9 6.9-3.2 11.2-4Z" />
    <path d="M34.4 82.9c4.9 0 8.3 3.2 8.3 8 0 4.9-3.5 8.3-8.4 8.3-4.8 0-8.2-3.4-8.2-8.2 0-4.9 3.4-8.1 8.3-8.1Z" />
  </svg>
);

export default BrandMark;
