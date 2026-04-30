"use client";

import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import styles from "./CustomCombobox.module.css";

type CustomComboboxProps = {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
};

export default function CustomCombobox({
  value,
  options,
  onChange,
  ariaLabel,
  placeholder,
  className = "",
  inputClassName = "",
}: CustomComboboxProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const visibleOptions = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return options;

    return options.filter((option) => option.toLowerCase().includes(query));
  }, [options, value]);

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

  const commitOption = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }

    if (!visibleOptions.length) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setHighlightedIndex(
        (current) =>
          (current + direction + visibleOptions.length) % visibleOptions.length,
      );
      return;
    }

    if (event.key === "Enter" && open) {
      event.preventDefault();
      commitOption(visibleOptions[highlightedIndex]);
    }
  };

  return (
    <div ref={rootRef} className={`${styles.comboRoot} ${className}`}>
      <input
        className={`${styles.comboInput} ${inputClassName}`}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setHighlightedIndex(0);
          setOpen(true);
        }}
        onFocus={() => {
          setHighlightedIndex(0);
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-autocomplete="list"
        role="combobox"
      />

      {open && visibleOptions.length ? (
        <div id={id} className={styles.comboMenu} role="listbox">
          {visibleOptions.map((option, index) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={index === highlightedIndex}
              className={`${styles.comboOption} ${
                index === highlightedIndex ? styles.comboOptionActive : ""
              }`}
              onMouseEnter={() => setHighlightedIndex(index)}
              onClick={() => commitOption(option)}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
