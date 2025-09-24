import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env : createEnv({
  clientPrefix: "PUBLIC_",
  client: {
		PUBLIC_YOLO_API_KEY: z.string(),
		PUBLIC_YOLO_ENDPOINT: z.string(),
		PUBLIC_BOUNDING_BOXES_ENDPOINT: z.string(),
		PUBLIC_YOLO_ADD_TRAIN_IMAGE: z.string(),
		PUBLIC_YOLO_RETRAIN: z.string(),
		PUBLIC_RETINANET_ENDPOINT:z.string(),
		PUBLIC_BOUNDING_BOXES_RETINANET_ENDPOINT:z.string(),
		PUBLIC_RETINANET_ADD_TRAIN_IMAGE:z.string(),
		PUBLIC_RETINANET_RETRAIN:z.string(),
		PUBLIC_RLHF_BASE_ENDPOINT:z.string(),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
});
