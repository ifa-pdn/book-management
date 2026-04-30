"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import { useI18n } from "../contexts/I18nContext";
import styles from "./DialogProvider.module.css";

type DialogRequest = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant: "alert" | "confirm";
  resolve: (value: boolean) => void;
};

type DialogContextValue = {
  alert: (message: string, title?: string) => Promise<void>;
  confirm: (message: string, title?: string) => Promise<boolean>;
};

const DialogContext = createContext<DialogContextValue | null>(null);

const dialogLabels = {
  id: {
    infoTitle: "Info",
    confirmTitle: "Konfirmasi",
    confirmLabel: "OK",
    cancelLabel: "Batal",
  },
  en: {
    infoTitle: "Info",
    confirmTitle: "Confirm",
    confirmLabel: "OK",
    cancelLabel: "Cancel",
  },
  ja: {
    infoTitle: "お知らせ",
    confirmTitle: "確認",
    confirmLabel: "OK",
    cancelLabel: "キャンセル",
  },
};

export function DialogProvider({ children }: { children: ReactNode }) {
  const { lang } = useI18n();
  const labels = dialogLabels[lang];
  const [dialog, setDialog] = useState<DialogRequest | null>(null);

  const closeDialog = (value: boolean) => {
    dialog?.resolve(value);
    setDialog(null);
  };

  const alert = useCallback((message: string, title = labels.infoTitle) => {
    return new Promise<void>((resolve) => {
      setDialog({
        title,
        message,
        confirmLabel: labels.confirmLabel,
        variant: "alert",
        resolve: () => resolve(),
      });
    });
  }, [labels.confirmLabel, labels.infoTitle]);

  const confirm = useCallback((message: string, title = labels.confirmTitle) => {
    return new Promise<boolean>((resolve) => {
      setDialog({
        title,
        message,
        confirmLabel: labels.confirmLabel,
        cancelLabel: labels.cancelLabel,
        variant: "confirm",
        resolve,
      });
    });
  }, [labels.cancelLabel, labels.confirmLabel, labels.confirmTitle]);

  return (
    <DialogContext.Provider value={{ alert, confirm }}>
      {children}
      {dialog ? (
        <div className={styles.overlay} role="presentation">
          <div
            className={styles.dialog}
            role={dialog.variant === "alert" ? "alertdialog" : "dialog"}
            aria-modal="true"
          >
            <h2 className={styles.title}>{dialog.title}</h2>
            <p className={styles.message}>{dialog.message}</p>
            <div className={styles.actions}>
              {dialog.variant === "confirm" ? (
                <button
                  type="button"
                  className={styles.button}
                  onClick={() => closeDialog(false)}
                >
                  {dialog.cancelLabel}
                </button>
              ) : null}
              <button
                type="button"
                className={`${styles.button} ${styles.primaryButton}`}
                onClick={() => closeDialog(true)}
                autoFocus
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useDialog must be used within DialogProvider");
  }
  return context;
}
