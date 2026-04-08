"use client";

import {
  Construction,
  MapPinned,
  PhoneCall,
  Settings,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "../../../components/UI/notifications/toast";

import { Container } from "@/components/layout/Container/Container";
import { useUser } from "@/queries/authQueries";
import {
  helpQuickLinks,
  normalizePhoneHref,
  publicSupportSettings,
} from "@/services/supportContent";
import {
  initialServiceRequestFormState,
  type ServiceRequestFormState,
} from "./form-state";
import { submitServiceRequest } from "./actions";
import styles from "./Services.module.css";

interface Service {
  id: string;
  icon: LucideIcon;
  name: string;
  description: string;
  pricePerHour: number;
  features: string[];
}

const services: Service[] = [
  {
    id: "crane",
    icon: Construction,
    name: "Послуги крана",
    description:
      "Автокран для підйому та переміщення важких вантажів на будівельних об'єктах.",
    pricePerHour: 1200,
    features: [
      "Вантажопідйомність до 25 тонн",
      "Висота підйому до 30 метрів",
      "Досвідчені крановики",
      "Робота в будь-яких умовах",
    ],
  },
  {
    id: "manitou",
    icon: Settings,
    name: "Послуги Маніту (телескопічний навантажувач)",
    description:
      "Телескопічний навантажувач для робіт на висоті та переміщення матеріалів.",
    pricePerHour: 950,
    features: [
      "Вантажопідйомність до 4 тонн",
      "Висота підйому до 18 метрів",
      "Маневреність на об'єкті",
      "Швидке переміщення матеріалів",
    ],
  },
  {
    id: "excavator",
    icon: Construction,
    name: "Послуги екскаватора",
    description:
      "Земельні роботи, копання котлованів, траншей та інші екскаваторні роботи.",
    pricePerHour: 850,
    features: [
      "Об'єм ковша 0.6-1.2 м³",
      "Глибина копання до 5 метрів",
      "Високопродуктивна техніка",
      "Професійні оператори",
    ],
  },
  {
    id: "truck",
    icon: Truck,
    name: "Послуги вантажівки",
    description:
      "Транспортування будівельних матеріалів та обладнання по місту та області.",
    pricePerHour: 650,
    features: [
      "Вантажопідйомність до 10 тонн",
      "Об'єм кузова до 40 м³",
      "Доставка по всій Україні",
      "Можливість вивантаження",
    ],
  },
];

function ServiceRequestSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={styles.submitButton}>
      {pending ? "Відправлення..." : "Відправити заявку"}
    </button>
  );
}

function ServiceRequestFormActions({ onClose }: { onClose: () => void }) {
  const { pending } = useFormStatus();

  return (
    <div className={styles.modalActions}>
      <button
        type="button"
        onClick={onClose}
        disabled={pending}
        className={styles.cancelButton}
      >
        Скасувати
      </button>
      <ServiceRequestSubmitButton />
    </div>
  );
}

function FormMessage({ state }: { state: ServiceRequestFormState }) {
  if (state.status === "idle" || !state.message) {
    return null;
  }

  return (
    <div
      className={
        state.status === "success" ? styles.formSuccess : styles.formError
      }
    >
      {state.message}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className={styles.fieldError}>{message}</p>;
}

const normalizeFormState = (
  state: ServiceRequestFormState | null | undefined
): ServiceRequestFormState => ({
  status: state?.status ?? initialServiceRequestFormState.status,
  message: state?.message ?? initialServiceRequestFormState.message,
  fieldErrors:
    state?.fieldErrors ?? initialServiceRequestFormState.fieldErrors ?? {},
});

function ServiceRequestModal({
  selectedService,
  user,
  onClose,
}: {
  selectedService: Service;
  user:
    | { name?: string | null; phone?: string | null; email?: string | null }
    | null
    | undefined;
  onClose: () => void;
}) {
  const [formState, formAction] = useActionState(
    submitServiceRequest,
    initialServiceRequestFormState
  );
  const resolvedFormState = normalizeFormState(formState);

  useEffect(() => {
    if (resolvedFormState.status === "success") {
      toast.success(resolvedFormState.message);
      onClose();
      return;
    }

    if (resolvedFormState.status === "error" && resolvedFormState.message) {
      toast.error(resolvedFormState.message);
    }
  }, [resolvedFormState, onClose]);

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderTop}>
            <h2 className={styles.modalTitle}>Заявка на послугу</h2>
            <button
              onClick={onClose}
              className={styles.modalCloseButton}
              type="button"
            >
              ✕
            </button>
          </div>
          <p className={styles.modalSubtitle}>
            {selectedService.name} • {selectedService.pricePerHour} грн/год
          </p>
          {!user && (
            <div className={styles.modalInfoBox}>
              <p className={styles.modalInfoText}>
                💡 Реєстрація не потрібна! Просто заповніть форму і ми
                зв&apos;яжемося з вами.
              </p>
            </div>
          )}
        </div>

        <form action={formAction} className={styles.modalForm}>
          <input type="hidden" name="serviceId" value={selectedService.id} />
          <input
            type="hidden"
            name="serviceName"
            value={selectedService.name}
          />
          <input
            type="hidden"
            name="servicePricePerHour"
            value={String(selectedService.pricePerHour)}
          />
          <input type="hidden" name="serviceSource" value="services-page" />

          <FormMessage state={resolvedFormState} />

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Ім&apos;я <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              name="customerName"
              required
              className={styles.input}
              placeholder="Ваше ім'я"
              defaultValue={user?.name ?? ""}
            />
            <FieldError message={resolvedFormState.fieldErrors.customerName} />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Телефон <span className={styles.required}>*</span>
            </label>
            <input
              type="tel"
              name="customerPhone"
              required
              className={styles.input}
              placeholder="+380"
              defaultValue={user?.phone ?? ""}
            />
            <FieldError message={resolvedFormState.fieldErrors.customerPhone} />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              name="customerEmail"
              className={styles.input}
              placeholder="your@email.com"
              defaultValue={user?.email ?? ""}
            />
            <FieldError message={resolvedFormState.fieldErrors.customerEmail} />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Адреса об&apos;єкту <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              name="address"
              required
              className={styles.input}
              placeholder="Місто, вулиця, будинок"
            />
            <FieldError message={resolvedFormState.fieldErrors.address} />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Коментар (опишіть деталі роботи)
            </label>
            <textarea
              name="comment"
              rows={4}
              className={styles.textarea}
              placeholder="Опишіть що потрібно зробити, кількість годин..."
            />
          </div>

          <ServiceRequestFormActions onClose={onClose} />
        </form>
      </div>
    </div>
  );
}

function ServicesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const { data: user } = useUser();
  const averageRate = Math.round(
    services.reduce((sum, service) => sum + service.pricePerHour, 0) /
      services.length
  );

  const handleServiceRequest = (service: Service) => {
    setSelectedService(service);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedService(null);
  };
  const supportPhoneHref = normalizePhoneHref(
    publicSupportSettings.contactPhone
  );

  return (
    <>
      <section
        className="brand-page-section"
        aria-labelledby="services-page-title"
      >
        <Container>
          <div
            className={`${styles.sectionFrame} ${styles.heroFrame} brand-card`}
          >
            <header className={styles.heroHeader}>
              <p className={styles.sectionEyebrow}>Сервіс БудЛідер</p>
              <h1 id="services-page-title" className={styles.heroTitle}>
                Послуги спецтехніки
              </h1>
              <p className={styles.heroDescription}>
                Оренда спецтехніки, логістика та виїзд на об&apos;єкт у єдиному
                сервісному форматі. Кожна заявка проходить швидке погодження, а
                техніка виїжджає з перевіреним екіпажем.
              </p>
              <ul className={styles.heroActions}>
                <li>
                  <span className="brand-pill">
                    <ShieldCheck size={16} /> Перевірені екіпажі
                  </span>
                </li>
                <li>
                  <span className="brand-pill">
                    <MapPinned size={16} /> Виїзд по місту й області
                  </span>
                </li>
                <li>
                  <span className="brand-pill">
                    <PhoneCall size={16} /> Швидке підтвердження заявки
                  </span>
                </li>
              </ul>
            </header>

            <ul className="brand-meta-list">
              <li className="brand-meta-item">
                <span className="brand-meta-value">{services.length}</span>
                <span className="brand-meta-label">
                  Основні напрямки техніки
                </span>
              </li>
              <li className="brand-meta-item">
                <span className="brand-meta-value">від 650 грн</span>
                <span className="brand-meta-label">
                  Погодинна ставка на старті
                </span>
              </li>
              <li className="brand-meta-item">
                <span className="brand-meta-value">≈ {averageRate} грн</span>
                <span className="brand-meta-label">
                  Середня ставка по послугах
                </span>
              </li>
            </ul>
          </div>
        </Container>
      </section>

      <section
        className="brand-page-section"
        aria-labelledby="services-list-title"
      >
        <Container>
          <div className={`${styles.sectionFrame} brand-card`}>
            <h2 id="services-list-title" className={styles.sectionTitle}>
              Оберіть техніку під конкретний тип робіт
            </h2>

            <ul className={styles.servicesGrid}>
              {services.map((service) => {
                const Icon = service.icon;
                return (
                  <li key={service.id} className={styles.serviceCard}>
                    <div className={styles.serviceHeader}>
                      <div className={`brand-icon-badge ${styles.serviceIcon}`}>
                        <Icon size={28} className={styles.serviceIconGlyph} />
                      </div>
                      <div className={styles.servicePrice}>
                        <div className={styles.servicePriceValue}>
                          {service.pricePerHour} грн
                        </div>
                        <div className={styles.servicePriceLabel}>
                          за годину
                        </div>
                      </div>
                    </div>

                    <h3 className={styles.serviceName}>{service.name}</h3>

                    <p className={styles.serviceDescription}>
                      {service.description}
                    </p>

                    <ul className={styles.serviceFeatures}>
                      {service.features.map((feature, index) => (
                        <li key={index} className={styles.serviceFeature}>
                          <span className={styles.serviceFeatureIcon}>✓</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      onClick={() => handleServiceRequest(service)}
                      className={`${styles.serviceButton} brand-button`}
                    >
                      Замовити послугу
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </Container>
      </section>

      <section
        className="brand-page-section"
        aria-labelledby="consultation-title"
      >
        <Container>
          <div className={styles.consultationGrid}>
            <div className={`${styles.consultationSection} brand-card`}>
              <div className={`brand-icon-badge ${styles.consultationIcon}`}>
                <PhoneCall size={28} />
              </div>
              <div className={styles.consultationContent}>
                <p className={styles.sectionEyebrow}>Підбір рішення</p>
                <h2
                  id="consultation-title"
                  className={styles.consultationTitle}
                >
                  Потрібна консультація перед замовленням?
                </h2>
                <p className={styles.consultationDescription}>
                  Пояснимо, яка техніка краще підійде під ваш об&apos;єкт,
                  підкажемо по тривалості робіт і порахуємо орієнтовний бюджет.
                  Для зв&apos;язку використовуємо єдиний номер підтримки{" "}
                  {publicSupportSettings.contactPhone}.
                </p>
                <div className={styles.consultationActions}>
                  <a href={supportPhoneHref} className="brand-button">
                    Зателефонувати
                  </a>
                  <a href="/contacts" className="brand-button-secondary">
                    Контакти та адреси
                  </a>
                </div>
                <div className={styles.consultationQuickLinks}>
                  {helpQuickLinks.slice(0, 2).map((link) => (
                    <a
                      key={link.id}
                      href={link.href}
                      className={styles.consultationQuickLink}
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <ul className={styles.statsGrid}>
              <li className={styles.statCard}>
                <div className={styles.statValue}>500+</div>
                <div className={styles.statLabel}>Виконаних проєктів</div>
              </li>
              <li className={styles.statCard}>
                <div className={styles.statValue}>10+</div>
                <div className={styles.statLabel}>Років на ринку</div>
              </li>
              <li className={styles.statCard}>
                <div className={styles.statValue}>98%</div>
                <div className={styles.statLabel}>Задоволених клієнтів</div>
              </li>
            </ul>
          </div>
        </Container>
      </section>

      {isModalOpen && selectedService && (
        <ServiceRequestModal
          selectedService={selectedService}
          user={user}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}

export default ServicesPage;
