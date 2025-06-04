export function convertTo12HourFormat(
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
