import { z } from 'zod';

export enum Models {
	Yolo = 'YOLO',
	Retinanet = 'RETINANET'
}

export const endpointsToUse = z.object({
	retrainEndpoint: z.string(),
	addImageEndpoint: z.string(),
	boundingBoxesEndpoint: z.string()
});
