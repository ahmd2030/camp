import { generateStripeLink } from './stripeService';
import { generatePaytabsLink } from './paytabsService';
import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export const generatePaymentLinks = async (invoiceId: string, amount: number) => {
  try {
    // Generate both links concurrently
    const [stripeLink, paytabsLink] = await Promise.all([
      generateStripeLink(invoiceId, amount),
      generatePaytabsLink(invoiceId, amount)
    ]);

    // Update the invoice in Firebase with the generated links
    const invoiceRef = doc(db, 'invoices', invoiceId);
    await updateDoc(invoiceRef, {
      stripePaymentLink: stripeLink,
      paytabsPaymentLink: paytabsLink,
      updatedAt: new Date()
    });

    return {
      success: true,
      links: {
        stripe: stripeLink,
        paytabs: paytabsLink
      }
    };
  } catch (error) {
    console.error('[Payment Router] Error generating payment links:', error);
    return { success: false, error };
  }
};
