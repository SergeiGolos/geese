import React from 'react';
import PropTypes from 'prop-types';

/**
 * Accessible Button component with proper event handling and prop validation
 */
function Button({ 
  onClick, 
  children, 
  disabled = false,
  className = '',
  ariaLabel,
  type = 'button',
  variant = 'primary',
  ...rest 
}) {
  const handleClick = React.useCallback(() => {
    if (!disabled && onClick) {
      onClick();
    }
  }, [onClick, disabled]);

  const handleKeyDown = React.useCallback((e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault();
      onClick?.();
    }
  }, [onClick, disabled]);

  const buttonClasses = [
    'btn',
    `btn--${variant}`,
    disabled && 'btn--disabled',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={buttonClasses}
      aria-label={ariaLabel}
      aria-disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}

Button.propTypes = {
  /** Click handler function */
  onClick: PropTypes.func,
  /** Button content */
  children: PropTypes.node.isRequired,
  /** Whether the button is disabled */
  disabled: PropTypes.bool,
  /** Additional CSS classes */
  className: PropTypes.string,
  /** Accessibility label */
  ariaLabel: PropTypes.string,
  /** Button type attribute */
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  /** Button variant for styling */
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'success'])
};

Button.defaultProps = {
  disabled: false,
  className: '',
  type: 'button',
  variant: 'primary'
};

export default Button;
