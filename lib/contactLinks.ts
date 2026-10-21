export const CONTACT_EMAIL = 'zateefinternational@gmail.com';
export const CONTACT_MAILTO_LINK = `mailto:${CONTACT_EMAIL}`;

export const WHATSAPP_NUMBER = '923289615985';
export const WHATSAPP_DISPLAY_NUMBER = '+92 328 9615 985';

const WHATSAPP_MESSAGE = 'Hi, I want to request a quote for clothing manufacturing.';
const CONTACT_WHATSAPP_MESSAGE = encodeURIComponent(WHATSAPP_MESSAGE).replace(/%20/g, '+');

export const CONTACT_WHATSAPP_LINK =
  `https://api.whatsapp.com/send/?phone=${WHATSAPP_NUMBER}&text=${CONTACT_WHATSAPP_MESSAGE}&type=phone_number&app_absent=0`;
export const QUOTE_WHATSAPP_LINK =
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
export const CONTACT_PHONE_LINK = `tel:+${WHATSAPP_NUMBER}`;
