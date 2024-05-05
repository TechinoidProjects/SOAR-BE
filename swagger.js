/**
 * @swagger
 * components:
 *   schemas:
 *     SurgicalVideo:
 *       type: object
 *       required:
 *         - surgeon_name
 *         - date_performed
 *         - procedure_type
 *         - surgeon_type
 *         - video_url
 *       properties:
 *         surgeon_name:
 *           type: string
 *           description: Name of the surgeon
 *         date_performed:
 *           type: string
 *           format: date-time
 *           description: Date of the surgery
 *         time:
 *           type: string
 *           format: time
 *           description: Time of the surgery
 *         duration:
 *           type: string
 *           format: time
 *           description: Duration of the video
 *         procedure_type:
 *           type: string
 *           description: Type of procedure
 *         surgeon_type:
 *           type: string
 *           description: Type of surgeon
 *         ml_model_type:
 *           type: string
 *           description: List of ML model types
 *         video_url:
 *           type: string
 *           description: URL of the uploaded video
 *     SurgicalVideoResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Indicates the success of the request
 *         data:
 *           $ref: '#/components/schemas/SurgicalVideo'
 *         message:
 *           type: string
 *           description: Additional message
 *
 * /api/save_surgical_videos:
 *   post:
 *     summary: Upload and save a surgical video
 *     tags: [Surgical Videos]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               surgeon_name:
 *                 type: string
 *                 description: Name of the surgeon
 *               date_performed:
 *                 type: string
 *                 format: date-time
 *                 description: Date of the surgery
 *               time:
 *                 type: string
 *                 format: time
 *                 description: Time of the surgery
 *               duration:
 *                 type: string
 *                 format: time
 *                 description: Duration of the video
 *               procedure_type:
 *                 type: string
 *                 description: Type of procedure
 *               surgeon_type:
 *                 type: string
 *                 description: Type of surgeon
 *               ml_model_type:
 *                 type: string
 *                 description: List of ML model types, separated by commas
 *               video_file:
 *                 type: string
 *                 format: binary
 *                 description: The surgical video file to upload
 *     responses:
 *       200:
 *         description: The uploaded surgical video data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SurgicalVideoResponse'
 *       400:
 *         description: Bad request, missing required fields
 *       500:
 *         description: Internal server error
 */
