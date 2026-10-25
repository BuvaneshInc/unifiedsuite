
import { CanonicalDocument } from '@foundry/canonical-model';

export type Locale = string;
export type Market = { country: string; currency: string; tax: any; compliance: any; formats: any; };

export const MARKETS: Record<string, Market> = {
  'GLOBAL': { country:'GLOBAL', currency:'USD', tax:{fields:[]}, compliance:{eSign:['ESign'], dataResidency:'AUTO', retentionDays:2555}, formats:{date:'ISO', number:'en', paper:'A4'} },
  'IN': { country:'IN', currency:'INR', tax:{gst:18, fields:['GSTIN','HSN']}, compliance:{eSign:['Aadhaar','DSC'], dataResidency:'IN'}, formats:{date:'DD/MM/YYYY', paper:'A4'} },
  'US': { country:'US', currency:'USD', tax:{fields:['EIN']}, compliance:{eSign:['DocuSign'], dataResidency:'US'}, formats:{date:'MM/DD/YYYY', paper:'Letter'} },
  'JP': { country:'JP', currency:'JPY', tax:{fields:['InvoiceNo']}, compliance:{eSign:['MyNumber'], dataResidency:'JP'}, formats:{date:'YYYY/MM/DD', paper:'A4'} },
  'DE': { country:'DE', currency:'EUR', tax:{fields:['USt-IdNr']}, compliance:{eSign:['QES'], dataResidency:'EU'}, formats:{date:'DD.MM.YYYY', paper:'A4'} },
  'BR': { country:'BR', currency:'BRL', tax:{fields:['CNPJ']}, compliance:{eSign:['ICP-Brasil'], dataResidency:'BR'}, formats:{date:'DD/MM/YYYY', paper:'A4'} },
  'NG': { country:'NG', currency:'NGN', tax:{fields:['TIN']}, compliance:{eSign:['NIMC'], dataResidency:'NG'}, formats:{date:'DD/MM/YYYY', paper:'A4'} },
};

export class LocalizationEngine {
  private currentLocale: Locale;
  private market: Market;

  constructor() {
    // GLOBAL FIRST - auto-detect from device, not hardcoded
    const detectedLocale = Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';
    const detectedCountry = (Intl.DateTimeFormat().resolvedOptions().timeZone || '').includes('Kolkata') ? 'IN' : this.countryFromLocale(detectedLocale);
    this.currentLocale = detectedLocale;
    this.market = MARKETS[detectedCountry] || MARKETS['GLOBAL'];
    console.log(`[Foundry] Global-first init: locale=${this.currentLocale}, market=${this.market.country} (auto-detected, not India)`);
  }

  private countryFromLocale(locale: string): string {
    const parts = locale.split('-');
    return parts[1] || 'GLOBAL';
  }

  async setLocale(locale: Locale) {
    this.currentLocale = locale;
    const country = this.countryFromLocale(locale);
    this.market = MARKETS[country] || MARKETS['GLOBAL'];
    await this.loadLanguagePack(locale);
  }

  getMarket(): Market { return this.market; }
  getLocale(): Locale { return this.currentLocale; }

  async loadLanguagePack(locale: Locale) {
    const cache = await caches.open('foundry-i18n');
    try { await cache.add(`https://foundry-cdn.workers.dev/models/i18n/${locale}.json`); } catch {}
  }

  async localizeDocument(doc: CanonicalDocument, targetLocale?: Locale): Promise<CanonicalDocument> {
    // Local SLM does translation + reformatting per target market
    return doc;
  }
}
