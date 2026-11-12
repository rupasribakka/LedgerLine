import React from 'react';
import Card from './Card';

/**
 * Backward compatibility wrapper for GlowCard.
 * Conforms to Design System 2.0: clean, restrained card without radial mouse glows.
 */
export default function GlowCard({
  children,
  className = '',
  _topGlow = false,
  onClick,
  as: Component = 'div',
  ...props
}) {
  return (
    <Card
      as={Component}
      onClick={onClick}
      className={className}
      {...props}
    >
      {children}
    </Card>
  );
}
