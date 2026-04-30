"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "./Icon";
import styles from "./CustomDateInput.module.css";

type CustomDateInputProps = {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  displayValue?: string;
};

const pad = (value: number) => String(value).padStart(2, "0");

const toDateValue = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseDateValue = (value: string) => {
  if (!value) return null;
  const normalized = value.replace(/\//g, "-");
  const date = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const monthLabel = (date: Date) =>
  new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(date);

export default function CustomDateInput({
  value,
  onChange,
  ariaLabel,
  placeholder = "YYYY-MM-DD",
  className = "",
  buttonClassName = "",
  displayValue,
}: CustomDateInputProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedDate = parseDateValue(value);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(selectedDate ?? new Date());

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

  const days = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    return [
      ...Array.from({ length: firstDay }, () => null),
      ...Array.from({ length: lastDate }, (_, index) => index + 1),
    ];
  }, [viewDate]);

  const shiftMonth = (amount: number) => {
    setViewDate(
      (current) => new Date(current.getFullYear(), current.getMonth() + amount, 1),
    );
  };

  const selectDay = (day: number) => {
    const nextDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    onChange(toDateValue(nextDate));
    setOpen(false);
  };

  const selectToday = () => {
    onChange(toDateValue(new Date()));
    setOpen(false);
  };

  const toggleCalendar = () => {
    if (!open && selectedDate) setViewDate(selectedDate);
    setOpen((current) => !current);
  };

  return (
    <div ref={rootRef} className={`${styles.dateRoot} ${className}`}>
      <button
        type="button"
        className={`${styles.dateButton} ${buttonClassName}`}
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={toggleCalendar}
      >
        <span
          className={`${styles.dateButtonText} ${
            value ? "" : styles.datePlaceholder
          }`}
        >
          {displayValue || value || placeholder}
        </span>
        <Icon name="calendar_month" className={styles.dateIcon} />
      </button>

      {open ? (
        <div className={styles.calendarPanel}>
          <div className={styles.calendarHeader}>
            <button
              type="button"
              className={styles.calendarNav}
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
            >
              <Icon name="chevron_left" />
            </button>
            <div className={styles.calendarTitle}>{monthLabel(viewDate)}</div>
            <button
              type="button"
              className={styles.calendarNav}
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
            >
              <Icon name="chevron_right" />
            </button>
          </div>

          <div className={styles.weekdayGrid}>
            {["S", "M", "T", "W", "T", "F", "S"].map((weekday, index) => (
              <div className={styles.weekday} key={`${weekday}-${index}`}>
                {weekday}
              </div>
            ))}
          </div>
          <div className={styles.calendarGrid}>
            {days.map((day, index) =>
              day ? (
                <button
                  type="button"
                  className={`${styles.dayButton} ${
                    selectedDate &&
                    selectedDate.getFullYear() === viewDate.getFullYear() &&
                    selectedDate.getMonth() === viewDate.getMonth() &&
                    selectedDate.getDate() === day
                      ? styles.selectedDay
                      : ""
                  }`}
                  key={day}
                  onClick={() => selectDay(day)}
                >
                  {day}
                </button>
              ) : (
                <div className={styles.emptyDay} key={`empty-${index}`} />
              ),
            )}
          </div>

          <div className={styles.calendarFooter}>
            <button
              type="button"
              className={styles.footerButton}
              onClick={selectToday}
            >
              Today
            </button>
            <button
              type="button"
              className={styles.footerButton}
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
