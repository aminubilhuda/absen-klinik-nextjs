"use client";

import { useEffect, useState } from "react";

interface ClinicData {
  namaKlinik: string;
  latitude: number;
  longitude: number;
  radiusMeter: number;
}

const defaultName = "Absensi Puskesmas";

export function useClinicName() {
  const [clinic, setClinic] = useState<ClinicData | null>(null);

  useEffect(() => {
    fetch("/api/clinic-setting")
      .then((r) => r.json())
      .then((data) => {
        if (data?.namaKlinik) setClinic(data);
      })
      .catch(() => {});
  }, []);

  return {
    name: clinic?.namaKlinik || defaultName,
    clinic,
  };
}
