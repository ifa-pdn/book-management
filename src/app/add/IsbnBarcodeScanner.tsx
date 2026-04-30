"use client";

import { useEffect, useRef, useState } from "react";
import {
  BarcodeFormat,
  BrowserMultiFormatReader,
  type IScannerControls,
} from "@zxing/browser";
import Icon from "../../components/Icon";
import { useI18n } from "../../contexts/I18nContext";
import styles from "./page.module.css";

type IsbnBarcodeScannerProps = {
  onDetected: (isbn: string) => void | Promise<void>;
  onClose: () => void;
};

const normalizeBarcodeValue = (value: string) =>
  value.replace(/[^\dXx]/g, "").toUpperCase();

const isLikelyIsbn = (value: string) =>
  value.length === 10 ||
  (value.length === 13 && (value.startsWith("978") || value.startsWith("979")));

const ensureVideoPreviewPlayback = (videoElement: HTMLVideoElement) => {
  videoElement.muted = true;
  videoElement.autoplay = true;
  videoElement.playsInline = true;

  if (videoElement.paused) {
    void videoElement.play().catch(() => undefined);
  }
};

const cameraConstraints: MediaStreamConstraints[] = [
  {
    audio: false,
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  },
  {
    audio: false,
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  },
  {
    audio: false,
    video: true,
  },
];

const getCameraStream = async () => {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera API is not available.");
  }

  let lastError: unknown;
  for (const constraints of cameraConstraints) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Could not open camera stream.");
};

const attachStreamToVideo = async (
  videoElement: HTMLVideoElement,
  stream: MediaStream,
) => {
  videoElement.srcObject = stream;
  ensureVideoPreviewPlayback(videoElement);

  if (videoElement.readyState >= HTMLMediaElement.HAVE_METADATA) {
    await videoElement.play().catch(() => undefined);
    return;
  }

  await new Promise<void>((resolve) => {
    const handleLoadedMetadata = () => {
      videoElement.removeEventListener("loadedmetadata", handleLoadedMetadata);
      void videoElement.play().catch(() => undefined).finally(resolve);
    };

    videoElement.addEventListener("loadedmetadata", handleLoadedMetadata);
  });
};

export default function IsbnBarcodeScanner({
  onDetected,
  onClose,
}: IsbnBarcodeScannerProps) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectedRef = useRef(false);
  const rejectedCodeRef = useRef("");
  const onDetectedRef = useRef(onDetected);
  const [scannerStatus, setScannerStatus] = useState(t("isbnScannerLooking"));
  const [scannerError, setScannerError] = useState("");

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    let cancelled = false;
    const videoElement = videoRef.current;

    const startScanner = async () => {
      if (!videoElement) return;
      ensureVideoPreviewPlayback(videoElement);

      try {
        const codeReader = new BrowserMultiFormatReader(undefined, {
          delayBetweenScanAttempts: 150,
          delayBetweenScanSuccess: 800,
          tryPlayVideoTimeout: 7000,
        });

        codeReader.possibleFormats = [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
        ];

        const stream = await getCameraStream();
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        await attachStreamToVideo(videoElement, stream);

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const controls = await codeReader.decodeFromVideoElement(
          videoElement,
          (result, _error, controls) => {
            if (!result || detectedRef.current) return;

            const scannedValue = normalizeBarcodeValue(result.getText());
            if (!scannedValue) return;

            if (!isLikelyIsbn(scannedValue)) {
              if (rejectedCodeRef.current !== scannedValue) {
                rejectedCodeRef.current = scannedValue;
                setScannerStatus(
                  `${t("isbnScannerNonIsbn")}: ${scannedValue}`,
                );
              }
              return;
            }

            detectedRef.current = true;
            setScannerStatus(`${t("isbnScannerDetected")}: ${scannedValue}`);
            controls.stop();
            controlsRef.current = null;
            void Promise.resolve(onDetectedRef.current(scannedValue));
          },
        );

        if (cancelled) {
          controls.stop();
          return;
        }

        controlsRef.current = controls;
        ensureVideoPreviewPlayback(videoElement);
      } catch {
        if (!cancelled) {
          setScannerError(t("isbnScannerCameraError"));
        }
      }
    };

    void startScanner();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoElement) {
        videoElement.srcObject = null;
      }
    };
  }, [t]);

  return (
    <section className={`glass-panel ${styles.scannerPanel}`}>
      <div className={styles.scannerHeader}>
        <div>
          <h2 className={styles.scannerTitle}>{t("isbnScannerTitle")}</h2>
          <p className={styles.scannerHint}>{t("isbnScannerHint")}</p>
        </div>
        <button
          type="button"
          className={`btn ${styles.scannerCloseButton}`}
          onClick={onClose}
        >
          <Icon name="close" />
          {t("isbnScannerClose")}
        </button>
      </div>

      <div className={styles.scannerFrame}>
        <video
          ref={videoRef}
          className={styles.scannerVideo}
          muted
          playsInline
          autoPlay
          onLoadedMetadata={(event) =>
            ensureVideoPreviewPlayback(event.currentTarget)
          }
          onCanPlay={(event) => ensureVideoPreviewPlayback(event.currentTarget)}
        />
        <div className={styles.scannerGuide} aria-hidden="true" />
      </div>

      {scannerError ? (
        <p className={styles.scannerError}>{scannerError}</p>
      ) : (
        <p className={styles.scannerStatus}>{scannerStatus}</p>
      )}
    </section>
  );
}
