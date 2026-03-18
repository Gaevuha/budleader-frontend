import { MessageSquare } from "lucide-react";
import styles from "../users/Users.module.css";

export const Reviews = () => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <MessageSquare size={28} color="var(--primary)" />
        <h2 className={styles.title}>Відгуки</h2>
      </div>
      <p style={{ color: "#666", fontSize: "15px" }}>
        Тут буде управління відгуками...
      </p>
    </div>
  );
};

export default Reviews;
