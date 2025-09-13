import {Models} from '../validators';
import {endpointsToUse} from '../validators';
import type {z} from "zod"
import {env} from '../../env';


export function workingEndpoint (model:Models) :z.infer<typeof endpointsToUse> {
	if (model === Models.Yolo) {
			const endpoints = {
				retrainEndpoint: 	env.PUBLIC_YOLO_RETRAIN,
				addImageEndpoint: env.PUBLIC_YOLO_ADD_TRAIN_IMAGE,
				boundingBoxesEndpoint : env.PUBLIC_BOUNDING_BOXES_ENDPOINT,
			}
			const parsedEndpoints = endpointsToUse.parse(endpoints)
			return parsedEndpoints
		}
	else {
		const endpoints = {
			retrainEndpoint: env.PUBLIC_RETINANET_RETRAIN,
			addImageEndpoint: env.PUBLIC_RETINANET_ADD_TRAIN_IMAGE,
			boundingBoxesEndpoint: env.PUBLIC_RETINANET_BOUNDING_BOXES_ENDPOINT
		};
		const parsedEndpoints = endpointsToUse.parse(endpoints);
		return parsedEndpoints;
	}
}