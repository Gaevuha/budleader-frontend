import { BarChart2 } from "lucide-react";
import styles from "../users/Users.module.css";

export const Analytics = () => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <BarChart2 size={28} color="var(--primary)" />
        <h2 className={styles.title}>Аналітика</h2>
      </div>
      <p style={{ color: "#666", fontSize: "15px" }}>
        Тут будуть графіки та статистика...
      </p>
    </div>
  );
};

export default Analytics;
