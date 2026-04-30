"use client";

import { useEffect, useRef, useState } from "react";
import {
  BarcodeFormat,
  BrowserMultiFormatReader,
  type IScannerControls,
} from "@zxing/browser";
import Icon from "../../../../components/Icon";
import { useI18n } from "../../../../contexts/I18nContext";
import styles from "./LoanStationPage.module.css";

type CopyQrScannerProps = {
  onDetected: (value: string) => void | Promise<void>;
  onClose: () => void;
};

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

export default function CopyQrScanner({
  onDetected,
  onClose,
}: CopyQrScannerProps) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectedRef = useRef(false);
  const onDetectedRef = useRef(onDetected);
  const [scannerStatus, setScannerStatus] = useState(
    t("stationQrScannerLooking"),
  );
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

        codeReader.possibleFormats = [BarcodeFormat.QR_CODE];

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

            const scannedValue = result.getText().trim();
            if (!scannedValue) return;

            detectedRef.current = true;
            setScannerStatus(t("stationQrScannerDetected"));
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
          setScannerError(t("stationQrScannerCameraError"));
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
    <section className={styles.qrScannerPanel}>
      <div className={styles.qrScannerHeader}>
        <div>
          <h3>{t("stationQrScannerTitle")}</h3>
          <p>{t("stationQrScannerHint")}</p>
        </div>
        <button
          type="button"
          className={styles.qrScannerCloseButton}
          onClick={onClose}
        >
          <Icon name="close" />
          {t("stationQrScannerClose")}
        </button>
      </div>

      <div className={styles.qrScannerFrame}>
        <video
          ref={videoRef}
          className={styles.qrScannerVideo}
          muted
          playsInline
          autoPlay
          onLoadedMetadata={(event) =>
            ensureVideoPreviewPlayback(event.currentTarget)
          }
          onCanPlay={(event) => ensureVideoPreviewPlayback(event.currentTarget)}
        />
        <div className={styles.qrScannerGuide} aria-hidden="true" />
      </div>

      {scannerError ? (
        <p className={styles.qrScannerError}>{scannerError}</p>
      ) : (
        <p className={styles.qrScannerStatus}>{scannerStatus}</p>
      )}
    </section>
  );
}
