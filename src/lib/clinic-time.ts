import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

export const CLINIC_TIME_ZONE = "America/Bahia";

export const clinicTime = (date: string | number | Date) =>
  dayjs(date).tz(CLINIC_TIME_ZONE);

export const clinicDate = (date: string) =>
  dayjs.tz(date, CLINIC_TIME_ZONE);
