export const generatePaytabsLink = async (invoiceId: string, amount: number): Promise<string> => {
  // TODO: Add PayTabs API Call here
  console.log(`[PayTabs Mock] Generating link for invoice ${invoiceId} with amount ${amount}`);
  // Return a mock URL for now
  return `https://secure.paytabs.com/mock/${invoiceId}?amt=${amount}`;
};
