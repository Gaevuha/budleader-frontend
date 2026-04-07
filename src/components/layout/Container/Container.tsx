import type { CSSProperties, ReactNode } from "react";

import styles from "./Container.module.css";

interface ContainerProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export const Container = ({
  children,
  className = "",
  style,
}: ContainerProps) => {
  return (
    <div className={`container ${styles.container} ${className}`} style={style}>
      {children}
    </div>
  );
};
