import React from 'react';

function Button(props) {
  const handleClick = () => {
    if (props.onClick) {
      props.onClick();
    }
  };

  return (
    <button onClick={handleClick}>
      {props.children}
    </button>
  );
}

export default Button;
