import React from 'react';
import Link from 'next/link';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string;
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  href,
  variant = 'secondary',
  children,
  className = '',
  ...props
}) => {
  const baseClasses = 'text-sm flex items-center justify-center';
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
  };

  const combinedClassName = `${baseClasses} ${variantClasses[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={combinedClassName}>
        {children}
      </Link>
    );
  }

  return (
    <button className={combinedClassName} {...props}>
      {children}
    </button>
  );
};

export default Button;