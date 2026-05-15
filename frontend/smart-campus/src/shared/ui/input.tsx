import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, leftIcon, rightIcon, invalid, ...props }, ref) => (
    <div className="relative w-full">
      {leftIcon && (
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
          {leftIcon}
        </span>
      )}
      <input
        ref={ref}
        className={cn(
          "w-full h-11 rounded-xl border bg-white text-sm text-navy",
          "border-border placeholder:text-navy-50",
          "focus:outline-none focus:border-burgundy focus:shadow-glow transition-all",
          "disabled:bg-surface-subtle disabled:opacity-70",
          leftIcon && "pl-10",
          rightIcon && "pr-10",
          !leftIcon && !rightIcon && "px-4",
          leftIcon && !rightIcon && "pr-4",
          !leftIcon && rightIcon && "pl-4",
          invalid && "border-accent-red focus:border-accent-red",
          className,
        )}
        {...props}
      />
      {rightIcon && (
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted">
          {rightIcon}
        </span>
      )}
    </div>
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(({ className, invalid, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-xl border bg-white px-4 py-3 text-sm text-navy",
      "border-border placeholder:text-navy-50 resize-y min-h-[96px]",
      "focus:outline-none focus:border-burgundy focus:shadow-glow transition-all",
      invalid && "border-accent-red focus:border-accent-red",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(({ className, invalid, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "w-full h-11 rounded-xl border bg-white px-4 text-sm text-navy",
      "border-border focus:outline-none focus:border-burgundy focus:shadow-glow transition-all",
      "appearance-none bg-no-repeat bg-[length:14px] bg-[right_14px_center]",
      invalid && "border-accent-red focus:border-accent-red",
      className,
    )}
    style={{
      backgroundImage:
        "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23515767' stroke-width='2'><path stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/></svg>\")",
    }}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

export function Label({
  className,
  children,
  required,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label
      className={cn("text-sm font-medium text-navy mb-1.5 block", className)}
      {...props}
    >
      {children}
      {required && <span className="text-accent-red ml-1">*</span>}
    </label>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-accent-red mt-1.5">{message}</p>;
}
