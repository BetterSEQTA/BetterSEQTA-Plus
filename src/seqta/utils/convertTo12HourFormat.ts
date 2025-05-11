// Function to convert time to 12-hour format
export function convertTo12HourFormat(
  time: string, // The time in 24-hour format (e.g., "14:30")
  noMinutes: boolean = false, // Optional flag to omit minutes in the result
): string {
  let [hours, minutes] = time.split(":").map(Number); // Split the time string and convert hours and minutes to numbers
  let period = "AM"; // Default period is "AM"

  // Check if time is in the PM range (12:00 - 23:59)
  if (hours >= 12) {
    period = "PM"; // Set period to "PM"
    if (hours > 12) hours -= 12; // Convert hours greater than 12 to 12-hour format (e.g., 13 -> 1)
  } else if (hours === 0) {
    hours = 12; // Special case for midnight (00:00 -> 12:00 AM)
  }

  let hoursStr = hours.toString(); // Convert hours to string
  if (hoursStr.length === 2 && hoursStr.startsWith("0")) {
    hoursStr = hoursStr.substring(1); // Remove leading zero for hours (e.g., "08" -> "8")
  }

  // Return the formatted time in 12-hour format, optionally including minutes
  return `${hoursStr}${noMinutes ? "" : `:${minutes.toString().padStart(2, "0")}`} ${period}`;
}
