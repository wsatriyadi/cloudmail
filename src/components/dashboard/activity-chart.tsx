"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

interface ActivityChartProps {
  data: { date: string; count: number }[];
}

/**
 * Recharts needs concrete color strings, and the theme tokens already hold a
 * full `hsl(...)` value — wrapping them again as `hsl(var(--token))` produced
 * invalid CSS and silently fell back to Recharts' defaults. Read the computed
 * token instead, and re-read it when the theme class changes.
 */
function useThemeColors() {
  const [colors, setColors] = useState({
    primary: "#2f6fe4",
    muted: "#4a5568",
    border: "#dbe2ea",
    popover: "#ffffff",
    popoverForeground: "#0f172a",
  });

  useEffect(() => {
    const read = () => {
      const s = getComputedStyle(document.documentElement);
      const get = (name: string, fallback: string) =>
        s.getPropertyValue(name).trim() || fallback;

      setColors({
        primary: get("--color-primary", "#2f6fe4"),
        muted: get("--color-muted-foreground", "#4a5568"),
        border: get("--color-border", "#dbe2ea"),
        popover: get("--color-popover", "#ffffff"),
        popoverForeground: get("--color-popover-foreground", "#0f172a"),
      });
    };

    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return colors;
}

export function ActivityChart({ data }: ActivityChartProps) {
  const colors = useThemeColors();
  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return (
      <div className="flex h-[280px] flex-col items-center justify-center gap-1 rounded-md border border-dashed text-center">
        <p className="text-sm font-medium">Belum ada email minggu ini</p>
        <p className="text-sm text-muted-foreground">
          Grafik terisi otomatis setelah email pertama masuk.
        </p>
      </div>
    );
  }

  return (
    <>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid vertical={false} stroke={colors.border} />
          <XAxis
            dataKey="date"
            stroke={colors.muted}
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke={colors.muted}
            fontSize={12}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={44}
          />
          <Tooltip
            cursor={{ fill: colors.border, opacity: 0.35 }}
            contentStyle={{
              backgroundColor: colors.popover,
              border: `1px solid ${colors.border}`,
              borderRadius: "8px",
              color: colors.popoverForeground,
              fontSize: "12px",
            }}
            labelFormatter={(label) => `Tanggal: ${label}`}
            formatter={(value: number) => [`${value} email`, "Jumlah"]}
          />
          <Bar dataKey="count" fill={colors.primary} radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>

      {/* Charts alone are not accessible; expose the same data as a table. */}
      <table className="sr-only">
        <caption>Jumlah email per hari selama 7 hari terakhir</caption>
        <thead>
          <tr>
            <th scope="col">Tanggal</th>
            <th scope="col">Jumlah email</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <td>{d.date}</td>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
