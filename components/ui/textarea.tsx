import * as React from 'react';

import {cn} from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({className, ...props}, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-input bg-background/80 backdrop-blur-sm',
          'px-4 py-3 text-base ring-offset-background',
          'shadow-[0_0_15px_rgba(255,16,240,0.1)] hover:shadow-[0_0_20px_rgba(255,16,240,0.2)]',
          'transition-all duration-300 ease-out',
          'placeholder:text-muted-foreground/70',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'focus-visible:shadow-[0_0_25px_rgba(255,16,240,0.25)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'md:text-sm',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export {Textarea};
