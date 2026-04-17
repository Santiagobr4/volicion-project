import { useState } from "react";
import { capitalizeDayCode } from "../utils/dateLabels";

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
  const [habit, setHabit] = useState({
    name: initialData?.name || "",
    days: initialData?.days || [],
  });
  const [formError, setFormError] = useState("");

  const toggleDay = (day) => {
    setFormError("");
    setHabit((prev) => ({
      ...prev,
      days: (prev.days || []).includes(day)
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day],
    }));
  };

  const toggleAllDays = () => {
    setFormError("");
    setHabit((prev) => ({
      ...prev,
      days: prev.days.length === WEEK_DAYS.length ? [] : [...WEEK_DAYS],
    }));
  };

  const handleSubmit = async () => {
    if (!habit.name.trim()) {
      setFormError("Ingresa un nombre para el hábito.");
      return;
    }

    if (habit.days.length === 0) {
      setFormError("Selecciona al menos un día.");
      return;
    }

    const response = await onSubmit({
      ...habit,
      name: habit.name.trim(),
    });

    if (!response?.success) {
      setFormError(response?.message || "No pudimos guardar el hábito.");
      return;
    }

    setHabit({ name: "", days: [] });
    setFormError("");
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-3">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-xl">
        <h2 className="text-xl font-semibold mb-1">
          {initialData ? "Editar hábito" : "Crear hábito"}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-300 mb-5">
          Define los días en los que se seguirá este hábito.
        </p>

        <input
          type="text"
          placeholder="Nombre del hábito"
          className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg mb-4 text-black dark:text-white dark:bg-slate-800"
          value={habit.name}
          onChange={(e) =>
            setHabit((prev) => ({
              ...prev,
              name: e.target.value,
            }))
          }
        />

        <div className="mb-2">
          <button
            type="button"
            onClick={toggleAllDays}
            className={`cursor-pointer p-2.5 rounded-lg w-full transition ${
              habit.days.length === WEEK_DAYS.length
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "bg-slate-100 dark:bg-slate-800"
            }`}
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
              className={`cursor-pointer p-2 rounded-lg transition ${
                habit.days.includes(day)
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "bg-slate-100 dark:bg-slate-800"
              }`}
            >
              {capitalizeDayCode(day)}
            </button>
          ))}
        </div>

        {formError && <p className="text-sm text-red-500 mb-4">{formError}</p>}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            Cancelar
          </button>

          <button
            onClick={handleSubmit}
            className="px-3 py-2 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:opacity-90 cursor-pointer"
          >
            {initialData ? "Guardar cambios" : "Crear"}
          </button>
        </div>
      </div>
    </div>
  );
}
