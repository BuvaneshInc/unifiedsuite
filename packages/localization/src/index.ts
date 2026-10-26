
import { CanonicalDocument } from '@foundry/canonical-model';

// Foundry Localization - Market + Language + Human Centric
// Every doc is stored canonical, rendered localized on demand

export type Locale = string; // en-IN, ta-IN, hi-IN, ja-JP, de-DE etc
export type Market = { 
  country: string; 
  tax: TaxRules; 
  compliance: ComplianceRules; 
  formats: FormatRules;
  currency: string;
};

export interface TaxRules { gst?: number; vat?: number; invoiceFields: string[]; }
export interface ComplianceRules { eSign: string[]; dataResidency: string; retentionDays: number; }
export interface FormatRules { date: string; number: string; paper: 'A4'|'Letter'; }

export const MARKETS: Record<string, Market> = {
  'IN': { country:'IN', currency:'INR', tax:{gst:18, invoiceFields:['GSTIN','HSN']}, compliance:{eSign:['Aadhaar','DSC'], dataResidency:'IN', retentionDays: 2555}, formats:{date:'DD/MM/YYYY', number:'en-IN', paper:'A4'} },
  'US': { country:'US', currency:'USD', tax:{vat:0, invoiceFields:['EIN']}, compliance:{eSign:['DocuSign'], dataResidency:'US', retentionDays: 2555}, formats:{date:'MM/DD/YYYY', number:'en-US', paper:'Letter'} },
  'JP': { country:'JP', currency:'JPY', tax:{vat:10, invoiceFields:['InvoiceNo']}, compliance:{eSign:['MyNumber'], dataResidency:'JP', retentionDays: 3650}, formats:{date:'YYYY/MM/DD', number:'ja-JP', paper:'A4'} },
  'DE': { country:'DE', currency:'EUR', tax:{vat:19, invoiceFields:['USt-IdNr']}, compliance:{eSign:['QES'], dataResidency:'EU', retentionDays: 3650}, formats:{date:'DD.MM.YYYY', number:'de-DE', paper:'A4'} },
};

export class LocalizationEngine {
  private currentLocale: Locale = 'en-IN';
  private market: Market = MARKETS['IN'];

  getMarket(): Market { return this.market; }
  getLocale(): Locale { return this.currentLocale; }

  async setLocale(locale: Locale, country: string) {
    this.currentLocale = locale;
    this.market = MARKETS[country] || MARKETS['IN'];
    // Load language pack from CDN - 10-50KB per locale, WASM cached
    await this.loadLanguagePack(locale);
  }

  async localizeDocument(doc: CanonicalDocument, targetLocale?: Locale): Promise<CanonicalDocument> {
    const locale = targetLocale || this.currentLocale;
    // AI does: translate text blocks, reformat dates/numbers/currency, swap compliance fields
    // All local via SLM - no cloud translation
    const localizedBlocks = await Promise.all(doc.blocks.map(async b => {
      if(b.type==='text') {
        return {...b, content: {...b.content, text: await this.translate(b.content.text, locale)}};
      }
      if(b.type==='table' && b.content.rows) {
        // Reformat numbers, dates, currency per market
        return {...b, content: {rows: this.reformatTable(b.content.rows, locale)}};
      }
      return b;
    }));
    return {...doc, blocks: localizedBlocks};
  }

  private async loadLanguagePack(locale: Locale) {
    // CDN: /models/i18n/{locale}.json (10KB) + tokenizer for that language
    const cache = await caches.open('foundry-i18n');
    await cache.add(`https://foundry-cdn.workers.dev/models/i18n/${locale}.json`);
  }
  private async translate(text: string, locale: Locale): Promise<string> {
    // Local SLM translation - uses small NLLB-200 distilled 80MB model per language pair, WASM cached
    return text; // placeholder - in prod: call WASM NLLB
  }
  private reformatTable(rows: any[][], locale: Locale) {
    // Use Intl.NumberFormat, Intl.DateTimeFormat per locale + market rules
    return rows;
  }
}
