import "dayjs/locale/pt-br";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import { doctorsTable } from "@/db/schema";

dayjs.extend(utc);
dayjs.locale("pt-br");

export const getAvailability = (doctor: typeof doctorsTable.$inferSelect) => {
  const days = (doctor.availableDays ?? []).map(day => ({
    dayOfWeek: dayjs().day(day.dayOfWeek).locale("pt-br"),
    from: dayjs().set('hour', parseInt(day.fromTime.split(':')[0]))
                 .set('minute', parseInt(day.fromTime.split(':')[1]))
                 .set('second', parseInt(day.fromTime.split(':')[2])),
    to: dayjs().set('hour', parseInt(day.toTime.split(':')[0]))
               .set('minute', parseInt(day.toTime.split(':')[1]))
               .set('second', parseInt(day.toTime.split(':')[2])),
  }));

  return days;
};
