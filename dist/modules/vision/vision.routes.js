import { testVisionController } from '@/modules/vision/vision.controller.js';
export async function visionRoutes(app) {
    app.post('/vision/test', testVisionController);
}
