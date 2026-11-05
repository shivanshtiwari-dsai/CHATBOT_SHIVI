/**
 * ShiviAI Image Generation Route Handler
 * ChatGPT (DALL-E 3) & Gemini (Imagen 3) Grade Proxy Engine
 */

const { expandToMasterImagePrompt, generateMasterAiImage } = require('../services/imageGenerationEngine.js');

/**
 * Handles POST /api/generate-image
 *
 * @param {object} req - HTTP request
 * @param {object} res - HTTP response
 * @param {object} body - Parsed JSON body
 * @param {function} sendJson - Server sendJson helper
 */
async function handleGenerateImage(req, res, body, sendJson) {
    try {
        const prompt = (body?.prompt || '').trim();
        const aspectRatio = body?.aspectRatio || (body?.size === '1024x1024' ? '1:1' : '16:9');
        const style = body?.style || 'vivid';

        if (!prompt) {
            return sendJson(res, 400, { success: false, error: 'Prompt is required for image generation.' });
        }

        const result = await generateMasterAiImage(prompt, {
            aspectRatio,
            size: body?.size,
            style
        });

        return sendJson(res, 200, {
            success: true,
            imageUrl: result.imageUrl,
            enhancedPrompt: result.enhancedPrompt,
            prompt: result.prompt,
            model: result.model,
            provider: result.provider,
            timestamp: new Date().toISOString()
        });

    } catch (err) {
        console.error('[API Error /api/generate-image]:', err.message);
        return sendJson(res, 500, {
            success: false,
            error: err.message || 'Image generation failed.'
        });
    }
}

module.exports = {
    handleGenerateImage,
    expandToMasterImagePrompt,
    generateMasterAiImage
};

