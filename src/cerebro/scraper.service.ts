
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';

@Injectable()
export class ScraperService {
    private readonly logger = new Logger(ScraperService.name);

    async scrapeWebsite(url: string): Promise<{ title: string; description: string; keywords: string[] }> {
        try {
            const { data } = await axios.get(url, {
                headers: { 'User-Agent': 'SuchtCerebroBot/1.0' }
            });
            const $ = cheerio.load(data);

            const title = $('title').text() || '';
            const description = $('meta[name="description"]').attr('content') || '';

            // Basic keyword extraction (splitting title/desc by spaces, filtering small words)
            const textContent = `${title} ${description}`;
            const keywords = textContent
                .split(/\s+/)
                .map(w => w.toLowerCase().replace(/[^a-z0-9áéíóúñ]/g, ''))
                .filter(w => w.length > 3 && !['para', 'con', 'las', 'los', 'una'].includes(w));

            return {
                title,
                description,
                keywords: [...new Set(keywords)].slice(0, 20) // Top 20 unique keywords
            };
        } catch (error) {
            this.logger.error(`Failed to scrape ${url}: ${error.message}`);
            return { title: '', description: '', keywords: [] };
        }
    }
}
