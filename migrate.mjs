import fs from "fs/promises";
import path from "path";

// ШЛЯХИ: Вкажіть правильний шлях до вашого старого проєкту Vite
const OLD_SRC = path.resolve("../budlider-vite/src"); // ЗМІНІТЬ НА ВАШ ШЛЯХ
const NEW_SRC = path.resolve("./src");

async function createDirectoryStructure() {
  const dirs = [
    "app/(public)/catalog",
    "app/(public)/product",
    "app/(public)/services",
    "app/(auth)/login",
    "app/(auth)/register",
    "app/(auth)/forgot-password",
    "app/(profile)/profile",
    "app/(profile)/orders",
    "app/(profile)/wishlist",
    "app/(checkout)/cart",
    "app/(checkout)/checkout",
    "app/(checkout)/success",
    "app/(admin)/admin/dashboard",
    "app/(admin)/admin/products",
    "app/(admin)/admin/categories",
    "app/(admin)/admin/orders",
    "app/(admin)/admin/users",
    "app/(admin)/admin/reviews",
    "components/layout",
    "components/ui",
    "components/product",
    "components/cart",
    "components/admin",
    "features",
    "store",
    "services",
    "queries",
    "hooks",
    "types",
    "utils",
    "styles",
  ];

  for (const dir of dirs) {
    await fs.mkdir(path.join(NEW_SRC, dir), { recursive: true });
  }
  console.log("✅ Структура директорій Next.js 15 створена.");
}

async function processFileContent(content) {
  let newContent = content;

  // 1. Міграція React Router -> Next.js
  newContent = newContent.replace(
    /import\s+{(.*?Link.*?)}\s+from\s+['"]react-router-dom['"]/g,
    "import Link from 'next/link'"
  );
  newContent = newContent.replace(
    /import\s+{(.*?useNavigate.*?)}\s+from\s+['"]react-router-dom['"]/g,
    "import { useRouter } from 'next/navigation'"
  );
  newContent = newContent.replace(
    /import\s+{(.*?useLocation.*?)}\s+from\s+['"]react-router-dom['"]/g,
    "import { usePathname } from 'next/navigation'"
  );

  newContent = newContent.replace(/<Link\s+to=/g, "<Link href=");
  newContent = newContent.replace(/useNavigate\(\)/g, "useRouter()");
  newContent = newContent.replace(/useLocation\(\)/g, "usePathname()");

  // 2. Перевірка на потребу "use client" (для Next.js App Router)
  const clientHooks = [
    "useState",
    "useEffect",
    "useRouter",
    "useRef",
    "useContext",
    "usePathname",
    "onClick",
    "onChange",
  ];
  const needsUseClient = clientHooks.some((hook) => newContent.includes(hook));

  if (needsUseClient && !newContent.includes('"use client"')) {
    newContent = '"use client";\n\n' + newContent;
  }

  // 3. Заміна імпортів стилів на локальні
  newContent = newContent.replace(
    /import\s+styles\s+from\s+['"](?:\.\/|\.\.\/)*([^'"]+\.module\.css)['"]/g,
    "import styles from './$1'"
  );

  return newContent;
}

async function migrateComponents(oldCompDir, newCompBaseDir) {
  try {
    const files = await fs.readdir(oldCompDir, { withFileTypes: true });

    for (const file of files) {
      if (file.isDirectory()) {
        // Рекурсивно проходимо по папках
        await migrateComponents(
          path.join(oldCompDir, file.name),
          newCompBaseDir
        );
      } else if (file.name.endsWith(".tsx")) {
        const compName = file.name.replace(".tsx", "");
        const oldCompPath = path.join(oldCompDir, file.name);

        // Знаходимо категорію для компонента (ui, layout, admin тощо), за замовчуванням 'ui'
        let subDir = "ui";
        if (compName.toLowerCase().includes("admin")) subDir = "admin";
        if (["Header", "Footer", "Container"].includes(compName))
          subDir = "layout";
        if (compName.toLowerCase().includes("product")) subDir = "product";
        if (compName.toLowerCase().includes("cart")) subDir = "cart";

        const targetDir = path.join(newCompBaseDir, subDir, compName);
        await fs.mkdir(targetDir, { recursive: true });

        // Читаємо та обробляємо .tsx файл
        let content = await fs.readFile(oldCompPath, "utf8");
        content = await processFileContent(content);
        await fs.writeFile(path.join(targetDir, file.name), content);

        // Шукаємо .module.css у старій папці (може бути поруч)
        const cssFileName = `${compName}.module.css`;
        const oldCssPath = path.join(oldCompDir, cssFileName);

        try {
          await fs.access(oldCssPath);
          await fs.copyFile(oldCssPath, path.join(targetDir, cssFileName));
          console.log(
            `📦 Згруповано: ${compName} + ${cssFileName} -> ${subDir}/${compName}/`
          );
        } catch {
          // Якщо css немає, ігноруємо
          console.log(
            `📄 Перенесено: ${compName} (без локального css) -> ${subDir}/${compName}/`
          );
        }
      }
    }
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log(`⚠️ Папка ${oldCompDir} не знайдена в старому проєкті.`);
    } else {
      console.error(error);
    }
  }
}

async function runMigration() {
  console.log("🚀 Початок автоматичної міграції на Next.js 15...\n");

  await createDirectoryStructure();

  console.log("\n🔄 Перенесення компонентів та стилів...");
  await migrateComponents(
    path.join(OLD_SRC, "components"),
    path.join(NEW_SRC, "components")
  );

  console.log("\n🎉 Автоматичний етап міграції завершено!");
  console.log("👉 Наступні ручні кроки:");
  console.log(
    "1. Перенесіть логіку Zustand у src/store (Redux Toolkit) або залиште Zustand, якщо вирішите не міняти."
  );
  console.log("2. Перенесіть API-запити у src/queries (React Query).");
  console.log(
    "3. Розподіліть сторінки з App.tsx по відповідних page.tsx у src/app/..."
  );
}

runMigration();
