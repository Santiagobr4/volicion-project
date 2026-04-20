import { useMemo, useRef, useState } from "react";
import { capitalizeDayCode } from "../utils/dateLabels";
import {
  buttonClassName,
  inputClassName,
  modalBackdropClassName,
  modalPanelClassName,
} from "./ui.js";

const WEEK_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export default function HabitModal({ open, onClose, onSubmit, initialData }) {
  const normalizeDays = (rawDays = []) => {
    const uniqueDays = new Set(rawDays);
    return WEEK_DAYS.filter((day) => uniqueDays.has(day));
  };

  const initialDays = normalizeDays(initialData?.days || []);

  const [habit, setHabit] = useState({
    name: initialData?.name || "",
    days: initialDays,
  });
  const [formError, setFormError] = useState("");
  const latestDaysRef = useRef(initialDays);

  const allDaysSelected = useMemo(
    () => WEEK_DAYS.every((day) => habit.days.includes(day)),
    [habit.days],
  );

  const toggleDay = (day) => {
    setFormError("");
    const nextDays = normalizeDays(
      (latestDaysRef.current || []).includes(day)
        ? latestDaysRef.current.filter((d) => d !== day)
        : [...latestDaysRef.current, day],
    );
    latestDaysRef.current = nextDays;
    setHabit((prev) => ({
      ...prev,
      days: nextDays,
    }));
  };

  const toggleAllDays = () => {
    setFormError("");
    const nextDays = allDaysSelected ? [] : [...WEEK_DAYS];
    latestDaysRef.current = nextDays;
    setHabit((prev) => ({
      ...prev,
      days: nextDays,
    }));
  };

  const handleSubmit = async () => {
    if (!initialData && !habit.name.trim()) {
      setFormError("Ingresa un nombre para el hábito.");
      return;
    }

    const daysToSave = normalizeDays(latestDaysRef.current || habit.days || []);

    if (daysToSave.length === 0) {
      setFormError("Selecciona al menos un día.");
      return;
    }

    const payload = initialData
      ? { days: daysToSave }
      : {
          ...habit,
          days: daysToSave,
          name: habit.name.trim(),
        };

    const response = await onSubmit(payload);

    if (!response?.success) {
      setFormError(response?.message || "No pudimos guardar el hábito.");
      return;
    }

    setHabit({ name: "", days: [] });
    latestDaysRef.current = [];
    setFormError("");
    onClose();
  };

  if (!open) return null;

  return (
    <div className={modalBackdropClassName}>
      <div className={`${modalPanelClassName} max-w-md p-5 sm:p-6`}>
        <h2 className="text-xl font-semibold mb-1">
          {initialData ? "Editar hábito" : "Crear hábito"}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-300 mb-5">
          Define los días en los que se seguirá este hábito.
        </p>
        {!initialData && (
          <p className="text-sm text-amber-700 dark:text-amber-300 mb-4 rounded-lg border border-amber-200/80 dark:border-amber-700/60 bg-amber-50/80 dark:bg-amber-950/30 px-3 py-2">
            Los hábitos nuevos empiezan a contar desde el lunes de la próxima
            semana.
          </p>
        )}

        <input
          type="text"
          placeholder="Nombre del hábito"
          className={`${inputClassName} mb-1`}
          value={habit.name}
          disabled={!!initialData}
          onChange={(e) =>
            setHabit((prev) => ({
              ...prev,
              name: e.target.value,
            }))
          }
        />
        {initialData && (
          <p className="text-xs text-slate-500 dark:text-slate-300 mb-4">
            El nombre del hábito no se puede editar. Solo puedes cambiar los
            días.
          </p>
        )}

        <div className="mb-2">
          <button
            type="button"
            onClick={toggleAllDays}
            className={buttonClassName({
              variant: allDaysSelected ? "primary" : "secondary",
              fullWidth: true,
            })}
          >
            Todos los días
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          {WEEK_DAYS.map((day) => (
            <button
              type="button"
              key={day}
              onClick={() => toggleDay(day)}
              className={buttonClassName({
                variant: habit.days.includes(day) ? "primary" : "secondary",
                size: "sm",
                fullWidth: true,
              })}
            >
              {capitalizeDayCode(day)}
            </button>
          ))}
        </div>

        {formError && <p className="text-sm text-red-500 mb-4">{formError}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className={buttonClassName({ variant: "secondary", size: "sm" })}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            className={buttonClassName({ variant: "primary", size: "sm" })}
          >
            {initialData ? "Guardar cambios" : "Crear"}
          </button>
        </div>
      </div>
    </div>
  );
}
