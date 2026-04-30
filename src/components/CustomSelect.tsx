"use client";

import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import Icon from "./Icon";
import styles from "./CustomSelect.module.css";

export type CustomSelectOption = {
  value: string;
  label: string;
};

type CustomSelectProps = {
  value: string;
  options: CustomSelectOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
};

export default function CustomSelect({
  value,
  options,
  onChange,
  ariaLabel,
  className = "",
  buttonClassName = "",
  disabled = false,
}: CustomSelectProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);
  const selectedLabel = selectedOption?.label ?? options[0]?.label ?? "";

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const selectedIndex = Math.max(
      0,
      options.findIndex((option) => option.value === value),
    );

    if (event.key === "Escape") {
      setOpen(false);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen((current) => !current);
      return;
    }

    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

    event.preventDefault();
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex =
      (selectedIndex + direction + options.length) % options.length;
    onChange(options[nextIndex].value);
    setOpen(true);
  };

  return (
    <div ref={rootRef} className={`${styles.selectRoot} ${className}`}>
      <button
        type="button"
        className={`${styles.selectButton} ${buttonClassName}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
      >
        <span className={styles.selectText}>{selectedLabel}</span>
        <Icon
          name={open ? "expand_less" : "expand_more"}
          className={styles.selectIcon}
        />
      </button>

      {open ? (
        <div id={id} className={styles.selectMenu} role="listbox">
          {options.map((option) => {
            const selected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                className={`${styles.selectOption} ${
                  selected ? styles.selectOptionSelected : ""
                }`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
