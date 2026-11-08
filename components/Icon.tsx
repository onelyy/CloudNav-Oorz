import React from 'react';
import { getIcon } from './iconMap';

interface IconProps {
  name: string;
  size?: number;
  className?: string;
}

const Icon: React.FC<IconProps> = ({ name, size = 20, className }) => {
  const IconComponent = getIcon(name);
  return <IconComponent size={size} className={className} />;
};

export default Icon;