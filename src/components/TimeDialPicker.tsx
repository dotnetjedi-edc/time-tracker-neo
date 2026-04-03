import { useMemo, useRef } from "react";
import { formatHourMinute, getClockDialValueFromPoint } from "../lib/time";

type PickerMode = "hour" | "minute";

interface TimeDialPickerProps {
  label: string;
  hour: number;
  minute: number;
  mode: PickerMode;
  onModeChange: (mode: PickerMode) => void;
  onHourChange: (hour: number) => void;
  onMinuteChange: (minute: number) => void;
  onConfirm?: () => void;
  compact?: boolean;
}

interface DialMarker {
  value: number;
  label: string;
  x: number;
  y: number;
  isMajor: boolean;
}

const HOUR_DIVISIONS = 24;
const MINUTE_DIVISIONS = 60;
const DIAL_RADIUS = 40;

const markerPosition = (
  value: number,
  divisions: number,
  radius = DIAL_RADIUS,
): Pick<DialMarker, "x" | "y"> => {
  const angle = (value / divisions) * Math.PI * 2 - Math.PI / 2;
  return {
    x: 50 + Math.cos(angle) * radius,
    y: 50 + Math.sin(angle) * radius,
  };
};

const hourMarkers: DialMarker[] = Array.from(
  { length: HOUR_DIVISIONS },
  (_, value) => {
    const { x, y } = markerPosition(value, HOUR_DIVISIONS);
    return {
      value,
      label: value.toString().padStart(2, "0"),
      x,
      y,
      isMajor: true,
    };
  },
);

const minuteMarkers: DialMarker[] = Array.from(
  { length: MINUTE_DIVISIONS },
  (_, value) => {
    const { x, y } = markerPosition(value, MINUTE_DIVISIONS);
    return {
      value,
      label: value.toString().padStart(2, "0"),
      x,
      y,
      isMajor: value % 5 === 0,
    };
  },
);

const selectionPosition = (value: number, mode: PickerMode) => {
  return markerPosition(
    value,
    mode === "hour" ? HOUR_DIVISIONS : MINUTE_DIVISIONS,
    DIAL_RADIUS - 8,
  );
};

export function TimeDialPicker({
  label,
  hour,
  minute,
  mode,
  onModeChange,
  onHourChange,
  onMinuteChange,
  onConfirm,
  compact = false,
}: TimeDialPickerProps) {
  const faceRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);

  const currentValue = mode === "hour" ? hour : minute;
  const currentMarkers = mode === "hour" ? hourMarkers : minuteMarkers;
  const { x, y } = useMemo(
    () => selectionPosition(currentValue, mode),
    [currentValue, mode],
  );
  const handX2 = 50 + (x - 50) * 0.74;
  const handY2 = 50 + (y - 50) * 0.74;

  const setValue = (value: number) => {
    if (mode === "hour") {
      onHourChange(value);
      onModeChange("minute");
      return;
    }

    onMinuteChange(value);
  };

  const updateFromPointer = (clientX: number, clientY: number) => {
    const face = faceRef.current;
    if (!face) {
      return;
    }

    const rect = face.getBoundingClientRect();
    const value = getClockDialValueFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      clientX,
      clientY,
      mode === "hour" ? HOUR_DIVISIONS : MINUTE_DIVISIONS,
    );

    if (mode === "hour") {
      onHourChange(value);
      return;
    }

    onMinuteChange(value);
  };

  return (
    <section
      className={[
        "rounded-[1.5rem] border border-ink/10 bg-white shadow-xl",
        compact ? "px-3 py-3 sm:px-3.5" : "px-4 py-4 sm:px-5",
      ].join(" ")}
      aria-label={label}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
            {label}
          </p>
          <p
            className={[
              "mt-2 font-mono font-semibold tracking-tight text-ink",
              compact
                ? "text-3xl sm:text-[2.6rem]"
                : "text-4xl sm:text-[3.5rem]",
            ].join(" ")}
          >
            {formatHourMinute(hour, minute)}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onModeChange("hour")}
            className={[
              compact
                ? "rounded-full px-3 py-1.5 text-xs font-semibold transition"
                : "rounded-full px-4 py-2 text-sm font-semibold transition",
              mode === "hour"
                ? "bg-ink text-white"
                : "border border-ink/10 text-ink/65 hover:border-ink/30 hover:text-ink",
            ].join(" ")}
          >
            Heures
          </button>
          <button
            type="button"
            onClick={() => onModeChange("minute")}
            className={[
              compact
                ? "rounded-full px-3 py-1.5 text-xs font-semibold transition"
                : "rounded-full px-4 py-2 text-sm font-semibold transition",
              mode === "minute"
                ? "bg-ink text-white"
                : "border border-ink/10 text-ink/65 hover:border-ink/30 hover:text-ink",
            ].join(" ")}
          >
            Minutes
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {[0, 15, 30, 45].map((quickMinute) => (
          <button
            key={quickMinute}
            type="button"
            onClick={() => {
              onModeChange("minute");
              onMinuteChange(quickMinute);
            }}
            className={[
              "rounded-full border border-ink/10 font-semibold text-ink/65 transition hover:border-ink/30 hover:text-ink",
              compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
            ].join(" ")}
          >
            {quickMinute.toString().padStart(2, "0")}
          </button>
        ))}
      </div>

      <div
        ref={faceRef}
        className={[
          "relative mx-auto mt-5 aspect-square w-full touch-none rounded-full bg-mist/45 select-none",
          compact ? "max-w-[14rem]" : "max-w-[22rem]",
        ].join(" ")}
        onPointerDown={(event) => {
          pointerIdRef.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          updateFromPointer(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if (pointerIdRef.current !== event.pointerId) {
            return;
          }

          updateFromPointer(event.clientX, event.clientY);
        }}
        onPointerUp={(event) => {
          if (pointerIdRef.current !== event.pointerId) {
            return;
          }

          updateFromPointer(event.clientX, event.clientY);
          event.currentTarget.releasePointerCapture(event.pointerId);
          pointerIdRef.current = null;
          if (mode === "hour") {
            onModeChange("minute");
          }
        }}
        onPointerCancel={() => {
          pointerIdRef.current = null;
        }}
      >
        <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
          <circle
            cx="50"
            cy="50"
            r="36"
            fill="white"
            fillOpacity="0.8"
            stroke="rgba(49,59,77,0.08)"
          />
          <line
            x1="50"
            y1="50"
            x2={handX2}
            y2={handY2}
            stroke="#ff885b"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <circle cx="50" cy="50" r="1.8" fill="#ff885b" />
          <circle
            cx={x}
            cy={y}
            r="2.8"
            fill="white"
            stroke="#ff885b"
            strokeWidth="1.4"
          />
          {currentMarkers.map((marker) => {
            const selected = marker.value === currentValue;

            if (!marker.isMajor) {
              return (
                <circle
                  key={`${mode}-${marker.value}`}
                  cx={marker.x}
                  cy={marker.y}
                  r="0.8"
                  fill={selected ? "#ff885b" : "rgba(49,59,77,0.28)"}
                />
              );
            }

            return (
              <g key={`${mode}-${marker.value}`}>
                <circle
                  cx={marker.x}
                  cy={marker.y}
                  r="4.5"
                  fill={selected ? "#ff885b" : "transparent"}
                />
                <text
                  x={marker.x}
                  y={marker.y + 0.6}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="3.4"
                  fontWeight="600"
                  fill={selected ? "white" : "rgba(49,59,77,0.72)"}
                >
                  {marker.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className={compact ? "mt-4 space-y-2.5" : "mt-5 space-y-3"}>
        <div
          className={[
            "grid gap-2",
            compact ? "grid-cols-4" : "grid-cols-4 sm:grid-cols-6",
          ].join(" ")}
        >
          {(mode === "hour"
            ? hourMarkers
            : minuteMarkers.filter((marker) => marker.isMajor)
          ).map((marker) => {
            const selected = marker.value === currentValue;

            return (
              <button
                key={`list-${mode}-${marker.value}`}
                type="button"
                aria-label={
                  mode === "hour"
                    ? `Choisir ${marker.label} heures`
                    : `Choisir ${marker.label} minutes`
                }
                onClick={() => setValue(marker.value)}
                className={[
                  compact
                    ? "rounded-xl px-2 py-1.5 text-xs font-semibold transition"
                    : "rounded-2xl px-3 py-2 text-sm font-semibold transition",
                  selected
                    ? "bg-coral text-white"
                    : "border border-ink/10 bg-white text-ink/70 hover:border-ink/30 hover:text-ink",
                ].join(" ")}
              >
                {marker.label}
              </button>
            );
          })}
        </div>

        {mode === "minute" ? (
          <label className="block space-y-2">
            <span
              className={
                compact
                  ? "text-xs font-medium text-ink/70"
                  : "text-sm font-medium text-ink/70"
              }
            >
              Minute précise
            </span>
            <input
              aria-label="Minute précise"
              type="number"
              min={0}
              max={59}
              value={minute}
              onChange={(event) => {
                const nextMinute = Number.parseInt(event.target.value, 10);
                if (Number.isNaN(nextMinute)) {
                  return;
                }

                onMinuteChange(Math.min(59, Math.max(0, nextMinute)));
              }}
              className={[
                "w-full border border-ink/10 bg-white text-ink outline-none transition focus:border-coral",
                compact
                  ? "rounded-xl px-3 py-2 text-sm"
                  : "rounded-2xl px-4 py-3 text-base",
              ].join(" ")}
            />
          </label>
        ) : null}

        {onConfirm ? (
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onConfirm}
              className={[
                "rounded-full bg-ink font-semibold text-white transition hover:bg-ink/90",
                compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
              ].join(" ")}
            >
              Confirmer
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
