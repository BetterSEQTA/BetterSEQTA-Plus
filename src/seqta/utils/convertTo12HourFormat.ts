import {
  convertTo12HourFormatWasm,
  isBetterseqtaWasmReady,
} from "@/wasm/init";

function convertTo12HourFormatTs(
  time: string,
  noMinutes: boolean = false,
): string {
  let [hours, minutes] = time.split(":").map(Number);
  let period = "am";

  if (hours >= 12) {
    period = "pm";
    if (hours > 12) hours -= 12;
  } else if (hours === 0) {
    hours = 12;
  }

  let hoursStr = hours.toString();
  if (hoursStr.length === 2 && hoursStr.startsWith("0")) {
    hoursStr = hoursStr.substring(1);
  }

  return `${hoursStr}${noMinutes ? "" : `:${minutes.toString().padStart(2, "0")}`}${period}`;
}

/** 12-hour time label; Rust/WASM when initialized, else TypeScript. */
export function convertTo12HourFormat(
  time: string,
  noMinutes: boolean = false,
): string {
  if (!isBetterseqtaWasmReady()) {
    return convertTo12HourFormatTs(time, noMinutes);
  }
  try {
    return convertTo12HourFormatWasm(time, noMinutes);
  } catch {
    return convertTo12HourFormatTs(time, noMinutes);
  }
}
