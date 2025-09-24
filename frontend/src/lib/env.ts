import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	clientPrefix: "VITE_",
	client: {
		VITE_YOLO_API_KEY: z.string().optional().default(""),
		VITE_YOLO_ENDPOINT: z.string().optional().default(""),
		VITE_BOUNDING_BOXES_ENDPOINT: z.string().optional().default(""),
		VITE_YOLO_ADD_TRAIN_IMAGE: z.string().optional().default(""),
		VITE_YOLO_RETRAIN: z.string().optional().default(""),

		VITE_RETINANET_ENDPOINT: z.string().optional().default(""),
		VITE_RETINANET_BOUNDING_BOXES_ENDPOINT: z.string().optional().default(""),
		VITE_BOUNDING_BOXES_RETINANET_ENDPOINT: z.string().optional().default(""),
		VITE_RETINANET_ADD_TRAIN_IMAGE: z.string().optional().default(""),
		VITE_RETINANET_RETRAIN: z.string().optional().default(""),

		VITE_RLHF_BASE_ENDPOINT: z.string().optional().default("")
	},
	runtimeEnv: import.meta.env,
	emptyStringAsUndefined: true
});