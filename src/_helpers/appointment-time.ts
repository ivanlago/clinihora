export const DEFAULT_APPOINTMENT_DURATION_IN_MINUTES = 30;

export const clockTimeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

export const appointmentIntervalsOverlap = ({
  firstStart,
  firstDuration,
  secondStart,
  secondDuration,
}: {
  firstStart: number;
  firstDuration: number;
  secondStart: number;
  secondDuration: number;
}) =>
  firstStart < secondStart + secondDuration &&
  firstStart + firstDuration > secondStart;
