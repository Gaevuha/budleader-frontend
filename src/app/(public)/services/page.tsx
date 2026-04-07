"use client";

import { Construction, Truck, Settings, type LucideIcon } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { useUser } from "@/queries/authQueries";
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

  const handleServiceRequest = (service: Service) => {
    setSelectedService(service);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedService(null);
  };

  return (
    <>
      <section>
        <div className={`container ${styles.container}`}>
          <div className={styles.header}>
            <h1 className={styles.title}>Послуги спецтехніки</h1>
            <p className={styles.subtitle}>
              «Будлідер» надає послуги спецтехніки для будівельних та земельних
              робіт
            </p>
          </div>

          <div className={styles.servicesGrid}>
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <article key={service.id} className={styles.serviceCard}>
                  <div className={styles.serviceHeader}>
                    <div className={styles.serviceIcon}>
                      <Icon className="w-7 h-7 text-primary" />
                    </div>
                    <div className={styles.servicePrice}>
                      <div className={styles.servicePriceValue}>
                        {service.pricePerHour} грн
                      </div>
                      <div className={styles.servicePriceLabel}>за годину</div>
                    </div>
                  </div>

                  <h2 className={styles.serviceName}>{service.name}</h2>

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
                    onClick={() => handleServiceRequest(service)}
                    className={styles.serviceButton}
                  >
                    Замовити послугу
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section>
        <div className="container">
          <div className={styles.consultationSection}>
            <div className={styles.consultationContent}>
              <h2 className={styles.consultationTitle}>
                Потрібна консультація?
              </h2>
              <p className={styles.consultationDescription}>
                Наші фахівці готові відповісти на всі ваші питання та допомогти
                з вибором послуг
              </p>
              <div className={styles.consultationActions}>
                <a
                  href="tel:+380441234567"
                  className={styles.consultationButton}
                >
                  Зателефонувати
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="container">
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>500+</div>
              <div className={styles.statLabel}>Виконаних проєктів</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>10+</div>
              <div className={styles.statLabel}>Років на ринку</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>98%</div>
              <div className={styles.statLabel}>Задоволених клієнтів</div>
            </div>
          </div>
        </div>
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
