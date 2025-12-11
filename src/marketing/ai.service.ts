import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HfInference } from '@huggingface/inference';

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);
    private hf: HfInference;
    private hfToken: string;

    constructor(private configService: ConfigService) {
        // User requested "Gratis & Open Source". 
        // We use Hugging Face Inference API which offers a free tier for many open source models.
        this.hfToken = this.configService.get<string>('HF_API_TOKEN') || '';

        if (this.hfToken) {
            this.hf = new HfInference(this.hfToken);
        } else {
            this.logger.warn('Hugging Face Token missing. AI features will fail or be mocked.');
        }
    }

    async generateAdCopy(eventDescription: string, platform: 'IG' | 'FB'): Promise<string[]> {
        if (!this.hf) return ['AI Disabled: HF Token missing'];

        const prompt = `[INST] Act as a professional Copywriter for Nightlife and Events.
        Create 3 engaging ad copies for ${platform === 'IG' ? 'Instagram' : 'Facebook'} for this event: "${eventDescription}".
        Use emojis. Keep it energetic. Language: Spanish.
        Format: Return only the 3 options separated by "---". [/INST]`;

        try {
            const result = await this.hf.textGeneration({
                model: 'mistralai/Mistral-7B-Instruct-v0.2',
                inputs: prompt,
                parameters: { max_new_tokens: 500, temperature: 0.8 }
            });

            // Parse response (Mistral might carry context, we need to extract generated text)
            let text = result.generated_text;
            // Clean up if the model echoes the prompt (common in raw completion endpoints)
            if (text.includes('[/INST]')) {
                text = text.split('[/INST]')[1];
            }

            return text.split('---').map(t => t.trim()).filter(t => t.length > 0);

        } catch (error) {
            this.logger.error('HF Text Gen failed:', error);
            return ["🔥 ¡Fiesta imperdible!", "🚀 ¡Reserva tu mesa ya!", "💃 Esta noche explotamos."];
        }
    }

    async analyzeCampaignPerformance(
        campaignName: string,
        metrics: { spend: number; impressions: number; ctr: number; roas: number; cpm: number }
    ): Promise<{ decision: 'SCALE_UP' | 'PAUSE' | 'LOWER_BUDGET' | 'MAINTAIN'; reasoning: string }> {
        if (!this.hf) return { decision: 'MAINTAIN', reasoning: 'AI Disabled' };

        // We use a smaller prompt for efficiency
        const prompt = `[INST] You are a Marketing AI. Analyze this campaign:
        Name: ${campaignName}
        ROAS: ${metrics.roas} (Target > 2.0)
        CPP (Cost Per Purchase): $${metrics['cpp']?.toFixed(2) || 0}
        Purchases: ${metrics['purchases'] || 0}
        CTR: ${metrics.ctr}% (Target > 1.0%)
        Spend: ${metrics.spend}

        Decisions: 
        - SCALE_UP (if ROAS > 2.5 OR CPP is low/profitable)
        - PAUSE (if ROAS < 1.0 AND Spend is high, or CPP is very high)
        - LOWER_BUDGET (if performance is mediocre)
        - MAINTAIN (if gathered data is insufficient or stable)
        
        Output strictly JSON: { "decision": "...", "reasoning": "..." } [/INST]`;

        try {
            const result = await this.hf.textGeneration({
                model: 'mistralai/Mistral-7B-Instruct-v0.2',
                inputs: prompt,
                parameters: { max_new_tokens: 200, temperature: 0.1 }
            });

            let text = result.generated_text;
            if (text.includes('[/INST]')) text = text.split('[/INST]')[1];

            // Clean json
            const jsonStr = text.match(/\{[\s\S]*\}/)?.[0] || '{}';
            return JSON.parse(jsonStr);

        } catch (error) {
            this.logger.error('HF Analysis failed:', error);
            return { decision: 'MAINTAIN', reasoning: 'Error en análisis AI' };
        }
    }

    async generateAdImage(prompt: string): Promise<string[]> {
        if (!this.hf) return ['https://via.placeholder.com/1024x1024?text=HF+Token+Missing'];

        try {
            // Using Stable Diffusion XL Base 1.0 (Free on HF Inference)
            const blob = await this.hf.textToImage({
                model: 'stabilityai/stable-diffusion-xl-base-1.0',
                inputs: `masterpiece, best quality, ${prompt}, cinematic lighting, 4k`,
                parameters: { negative_prompt: 'blur, low quality, distortion' }
            });

            // Convert Blob to Base64
            const buffer = Buffer.from(await (blob as any).arrayBuffer());
            const base64 = Buffer.from(buffer).toString('base64');
            const dataUrl = `data:image/jpeg;base64,${base64}`;

            return [dataUrl];

        } catch (error) {
            this.logger.error('HF Image Gen failed:', error);
            // Fallback
            return ['https://via.placeholder.com/1024x1024?text=Image+Generation+Error'];
        }
    }
}
