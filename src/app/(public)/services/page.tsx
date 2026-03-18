"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { PhoneCall, X } from "lucide-react";

import { apiClient as api } from "@/services/apiClient";
import type { ApiResponse } from "@/types/api";
import type { ServiceItem } from "@/types/content";
import { Container } from "@/components/layout/Container/Container";
import { Button } from "@/components/UI/Button/Button";
import styles from "./Services.module.css";

const normalizeServices = (raw: unknown): ServiceItem[] => {
  if (!raw || typeof raw !== "object") {
    return [];
  }

  const candidate = raw as {
    services?: ServiceItem[];
    data?: { services?: ServiceItem[] } | ServiceItem[];
  };

  if (Array.isArray(candidate.services)) {
    return candidate.services;
  }

  if (Array.isArray(candidate.data)) {
    return candidate.data;
  }

  if (candidate.data && Array.isArray(candidate.data.services)) {
    return candidate.data.services;
  }

  return [];
};

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(
    null
  );

  useEffect(() => {
    const loadServices = async () => {
      try {
        const response = await api.get<
          ApiResponse<{ services: ServiceItem[] }> | { services: ServiceItem[] }
        >("/api/services");
        setServices(normalizeServices(response.data));
      } catch {
        setServices([]);
      }
    };

    void loadServices();
  }, []);

  return (
    <Container className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Наші послуги спецтехніки</h1>
      </div>

      <div className={styles.grid}>
        {services.map((service) => (
          <div
            key={service.id}
            className={styles.card}
            onClick={() => setSelectedService(service)}
          >
            <div className={styles.cardImageWrapper}>
              <Image
                src={service.image}
                alt={service.title}
                className={styles.cardImage}
                width={800}
                height={400}
                unoptimized
              />
            </div>
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>{service.title}</h3>
              <p className={styles.cardDesc}>{service.shortDesc}</p>
            </div>
          </div>
        ))}
      </div>

      {selectedService && (
        <div
          className={styles.modalOverlay}
          onClick={() => setSelectedService(null)}
        >
          <div
            className={styles.modal}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <button
              className={styles.closeBtn}
              onClick={() => setSelectedService(null)}
            >
              <X size={24} />
            </button>

            <div className={styles.modalImageWrapper}>
              <Image
                src={selectedService.image}
                alt={selectedService.title}
                className={styles.modalImage}
                width={1200}
                height={500}
                unoptimized
              />
            </div>

            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <div>
                  <h2 className={styles.modalTitle}>{selectedService.title}</h2>
                  <p className={styles.modalPrice}>{selectedService.price}</p>
                </div>
              </div>

              <div className={styles.modalBody}>
                <p className={styles.modalFullDesc}>
                  {selectedService.fullDesc}
                </p>
              </div>

              <div className={styles.modalFooter}>
                <Button
                  variant="secondary"
                  onClick={() => setSelectedService(null)}
                >
                  Закрити
                </Button>
                <Button>
                  <PhoneCall size={18} style={{ marginRight: 8 }} />
                  Замовити послугу
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
}
