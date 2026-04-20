import { beforeEach, describe, expect, it } from "vitest";
import {
  clearHabitOrder,
  getHabitOrderStorageKey,
  loadHabitOrder,
  saveHabitOrder,
} from "./habitOrderStorage";

beforeEach(() => {
  localStorage.clear();
});

describe("habitOrderStorage", () => {
  it("namespaces order by user id", () => {
    expect(getHabitOrderStorageKey(12)).toBe("weekly_active_habit_order:12");
    expect(getHabitOrderStorageKey(null)).toBe("weekly_active_habit_order");
  });

  it("loads and saves namespaced order", () => {
    saveHabitOrder(7, [3, 1, 2]);
    expect(loadHabitOrder(7)).toEqual([3, 1, 2]);
    expect(localStorage.getItem("weekly_active_habit_order:7")).toBe(
      JSON.stringify([3, 1, 2]),
    );
  });

  it("clears legacy and namespaced order", () => {
    localStorage.setItem("weekly_active_habit_order", JSON.stringify([1]));
    localStorage.setItem("weekly_active_habit_order:7", JSON.stringify([7]));

    clearHabitOrder(7);

    expect(localStorage.getItem("weekly_active_habit_order")).toBeNull();
    expect(localStorage.getItem("weekly_active_habit_order:7")).toBeNull();
  });
});
