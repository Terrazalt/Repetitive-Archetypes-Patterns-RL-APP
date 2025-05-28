import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "PUBLIC_",
  client: {
    PUBLIC_YOLO_API_KEY: z.string(),
    PUBLIC_YOLO_ENDPOINT: z.string(),
    PUBLIC_BOUNDING_BOXES_ENDPOINT: z.string(),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
});
