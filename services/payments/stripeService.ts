export const generateStripeLink = async (invoiceId: string, amount: number): Promise<string> => {
  // TODO: Add Stripe SDK and real API call here
  console.log(`[Stripe Mock] Generating link for invoice ${invoiceId} with amount ${amount}`);
  // Return a mock URL for now
  return `https://checkout.stripe.com/mock/${invoiceId}?amt=${amount}`;
};
