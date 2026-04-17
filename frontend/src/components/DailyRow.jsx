import { getPercentageStyle } from "../utils/habitHelpers";

export default function DailyRow({ dates, stats }) {
  return (
    <tr>
      <th className="text-left px-3 text-gray-400 min-w-50">Diario</th>

      {dates.map((date) => (
        <th key={date}>
          <div
            className={`w-15 h-12.5 rounded-lg flex items-center justify-center font-semibold ${getPercentageStyle(
              stats[date] ?? 100,
            )}`}
          >
            {stats[date] ?? 100}%
          </div>
        </th>
      ))}

      <th></th>
    </tr>
  );
}
