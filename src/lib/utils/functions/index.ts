import { Models } from '../validators';
import {env} from '../../env';

type EndpointConfig = {
	retrainEndpoint: string;
	addImageEndpoint: string;
	boundingBoxesEndpoint: string;
};

export function workingEndpoint(model: Models): EndpointConfig {
	switch (model) {
		case Models.Yolo:
			return {
				retrainEndpoint: env.VITE_YOLO_RETRAIN,
				addImageEndpoint: env.VITE_YOLO_ADD_TRAIN_IMAGE,
				boundingBoxesEndpoint: env.VITE_BOUNDING_BOXES_ENDPOINT
			};
		case Models.Retinanet:
			return {
				retrainEndpoint: env.VITE_RETINANET_RETRAIN,
				addImageEndpoint: env.VITE_RETINANET_ADD_TRAIN_IMAGE,
				boundingBoxesEndpoint: env.VITE_BOUNDING_BOXES_RETINANET_ENDPOINT
			};
		default:
			throw new Error(`Modelo no soportado: ${model}`);
	}
}