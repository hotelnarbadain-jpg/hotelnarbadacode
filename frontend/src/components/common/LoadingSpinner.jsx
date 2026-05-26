import React from 'react';

const LoadingSpinner = ({ height = '400px' }) => {
  return (
    <div className="flex items-center justify-center" style={{ height }}>
      <div className="spinner"></div>
    </div>
  );
};

export default LoadingSpinner;
