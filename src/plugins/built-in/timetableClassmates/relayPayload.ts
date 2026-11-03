import type { ClassRef } from "./classKeys";

export type TimetableSharePlainV1 = {
  v: 1;
  instance: string;
  sender: {
    seqtaId: number;
    personUuid: string;
    cloudUserId: string | null;
  };
  period: { from: string; until: string };
  classes: ClassRef[];
};

const MAX_CLASSES = 400;

export function buildSharePayload(input: {
  instance: string;
  sender: TimetableSharePlainV1["sender"];
  period: TimetableSharePlainV1["period"];
  classes: ClassRef[];
}): TimetableSharePlainV1 {
  return {
    v: 1,
    instance: input.instance,
    sender: input.sender,
    period: input.period,
    classes: input.classes.slice(0, MAX_CLASSES),
  };
}

/** One class per bundle ciphertext on the relay. */
export function classBundlePlaintext(input: {
  seqtaStudentId: number;
  personUuid: string;
  cloudUserId: string | null;
  classRef: ClassRef;
}): Record<string, unknown> {
  return {
    v: 1,
    seqta_student_id: input.seqtaStudentId,
    person_uuid: input.personUuid,
    cloud_user_id: input.cloudUserId,
    class: input.classRef,
  };
}
